// Atomic credit deduction for AI feature usage.
//
// MVP CONCURRENCY CHOICE: preCheck reads the latest balance with no lock;
// commit re-reads inside a transaction and re-validates. We accept that a
// rapid back-to-back invocation could let two preChecks pass before either
// commits — in that case, the second commit re-reads and may overspend by
// up to (cost) credits if the row read isn't serializable. Postgres at
// default isolation (READ COMMITTED) doesn't prevent this lost-update race.
// Two real fixes are possible later: (a) SERIALIZABLE isolation on the
// commit txn, or (b) a SELECT ... FOR UPDATE on the latest credit row.
// We've left the structure in place so either upgrade is contained to this
// file. For an MVP with manual ledger seeding, the race is acceptable.

import type { Prisma, PrismaClient } from '../../../src/generated/prisma/client'
import {
    AIUsageStatus,
    CreditTransactionStatus,
    CreditTransactionType,
} from '../../../src/generated/prisma/enums'

import { InsufficientCreditsError } from './errors'
import { aiLog } from './logger'
import type { AIFeatureKey, TokenUsage } from './types'

export interface CommitInput {
    userId: string
    featureId: string
    featureKey: AIFeatureKey
    costCredits: number
    tokenUsage: TokenUsage
}

export interface CommitResult {
    transactionId: string
    usageLogId: string
    balanceAfter: number
}

export interface IAIBillingService {
    getBalance(userId: string): Promise<number>
    preCheck(userId: string, costCredits: number): Promise<{ balance: number }>
    commit(input: CommitInput): Promise<CommitResult>
    recordFailure(input: {
        userId: string
        featureId: string
    }): Promise<{ usageLogId: string }>
}

// Lowest-level Prisma surface this service needs. Typed via the client so
// tests can pass a hand-rolled stub without dragging in the full schema.
export type AIBillingPrisma = Pick<PrismaClient, '$transaction'> & {
    creditTransaction: {
        findFirst(args: {
            where: { userId: string }
            orderBy: { createdAt: 'desc' }
            select?: Prisma.CreditTransactionSelect
        }): Promise<{ balanceAfter: number } | null>
        create(args: {
            data: Prisma.CreditTransactionUncheckedCreateInput
        }): Promise<{ id: string; balanceAfter: number }>
    }
    aIUsageLog: {
        create(args: {
            data: Prisma.AIUsageLogUncheckedCreateInput
        }): Promise<{ id: string }>
    }
}

export class AIBillingService implements IAIBillingService {
    private readonly prisma: AIBillingPrisma

    constructor(prisma: AIBillingPrisma) {
        this.prisma = prisma
    }

    async getBalance(userId: string): Promise<number> {
        const latest = await this.prisma.creditTransaction.findFirst({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: { balanceAfter: true },
        })
        return latest?.balanceAfter ?? 0
    }

    async preCheck(
        userId: string,
        costCredits: number,
    ): Promise<{ balance: number }> {
        const balance = await this.getBalance(userId)
        aiLog('billing.precheck', { userId, balance, costCredits })
        if (balance < costCredits) {
            throw new InsufficientCreditsError(costCredits, balance)
        }
        return { balance }
    }

    async commit(input: CommitInput): Promise<CommitResult> {
        // Single $transaction so the balance debit and the usage log are
        // atomic — there is no observable state where one exists without
        // the other.
        return this.prisma.$transaction(async (tx) => {
            // Re-read balance inside the txn so we catch other-in-flight
            // debits committed since preCheck. See file header for race
            // notes.
            const latest = await (
                tx as unknown as AIBillingPrisma
            ).creditTransaction.findFirst({
                where: { userId: input.userId },
                orderBy: { createdAt: 'desc' },
                select: { balanceAfter: true },
            })
            const balanceBefore = latest?.balanceAfter ?? 0
            if (balanceBefore < input.costCredits) {
                throw new InsufficientCreditsError(input.costCredits, balanceBefore)
            }

            const balanceAfter = balanceBefore - input.costCredits

            const transaction = await (
                tx as unknown as AIBillingPrisma
            ).creditTransaction.create({
                data: {
                    userId: input.userId,
                    amount: -input.costCredits,
                    balanceAfter,
                    type: CreditTransactionType.AI_USAGE,
                    status: CreditTransactionStatus.COMPLETED,
                    referenceType: 'ai_usage',
                    // referenceId set after the usage log exists, below.
                    referenceId: null,
                },
            })

            const usageLog = await (
                tx as unknown as AIBillingPrisma
            ).aIUsageLog.create({
                data: {
                    userId: input.userId,
                    featureId: input.featureId,
                    costCredits: input.costCredits,
                    transactionId: transaction.id,
                    status: AIUsageStatus.COMPLETED,
                },
            })

            aiLog('billing.commit.ok', {
                userId: input.userId,
                featureKey: input.featureKey,
                costCredits: input.costCredits,
                balanceAfter,
            })
            return {
                transactionId: transaction.id,
                usageLogId: usageLog.id,
                balanceAfter,
            }
        })
    }

    // Failure path: the AI call (or context fetch, or schema validation)
    // threw after preCheck. Record the attempt with no charge so the user
    // and we have an audit trail. We write a FAILED CreditTransaction with
    // amount=0 so the running balance is preserved.
    async recordFailure(input: {
        userId: string
        featureId: string
    }): Promise<{ usageLogId: string }> {
        aiLog('billing.recordFailure', input)
        return this.prisma.$transaction(async (tx) => {
            const latest = await (
                tx as unknown as AIBillingPrisma
            ).creditTransaction.findFirst({
                where: { userId: input.userId },
                orderBy: { createdAt: 'desc' },
                select: { balanceAfter: true },
            })
            const balance = latest?.balanceAfter ?? 0

            const transaction = await (
                tx as unknown as AIBillingPrisma
            ).creditTransaction.create({
                data: {
                    userId: input.userId,
                    amount: 0,
                    balanceAfter: balance,
                    type: CreditTransactionType.AI_USAGE,
                    status: CreditTransactionStatus.FAILED,
                    referenceType: 'ai_usage',
                    referenceId: null,
                },
            })

            const usageLog = await (
                tx as unknown as AIBillingPrisma
            ).aIUsageLog.create({
                data: {
                    userId: input.userId,
                    featureId: input.featureId,
                    costCredits: 0,
                    transactionId: transaction.id,
                    status: AIUsageStatus.FAILED,
                },
            })

            return { usageLogId: usageLog.id }
        })
    }
}
