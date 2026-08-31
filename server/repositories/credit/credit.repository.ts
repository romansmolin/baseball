// Read + append access to the CreditTransaction double-entry ledger. The
// user's balance is the `balanceAfter` of their most recent row (there is no
// balance column on User). grantCredits appends a new COMPLETED row, computing
// the running total inside a $transaction so a concurrent grant can't skip a
// balance. Debits for AI usage are written by AIBillingService directly; this
// repository covers wallet reads and purchase/admin grants.

import {
    CreditTransactionStatus,
    CreditTransactionType,
} from '../../../src/generated/prisma/enums'
import { prisma } from '../../lib/prisma'
import { handleRepositoryError } from '../../shared/db/prisma-error.utils'

import type {
    CreditTransactionRecord,
    GrantCreditsInput,
    ICreditRepository,
} from './credit.repository.interface'

export class CreditRepository implements ICreditRepository {
    async getBalance(userId: string): Promise<number> {
        try {
            const latest = await prisma.creditTransaction.findFirst({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                select: { balanceAfter: true },
            })
            return latest?.balanceAfter ?? 0
        } catch (error) {
            throw handleRepositoryError(error)
        }
    }

    async getTransactions(userId: string, limit = 50): Promise<CreditTransactionRecord[]> {
        try {
            return await prisma.creditTransaction.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: limit,
                select: {
                    id: true,
                    userId: true,
                    amount: true,
                    balanceAfter: true,
                    type: true,
                    status: true,
                    referenceType: true,
                    referenceId: true,
                    createdAt: true,
                },
            })
        } catch (error) {
            throw handleRepositoryError(error)
        }
    }

    async existsByReference(
        referenceType: string,
        referenceIdPrefix: string,
    ): Promise<boolean> {
        try {
            const row = await prisma.creditTransaction.findFirst({
                where: {
                    referenceType,
                    referenceId: { startsWith: referenceIdPrefix },
                },
                select: { id: true },
            })
            return row != null
        } catch (error) {
            throw handleRepositoryError(error)
        }
    }

    async grantCredits(input: GrantCreditsInput): Promise<CreditTransactionRecord> {
        try {
            return await prisma.$transaction(async (tx) => {
                const latest = await tx.creditTransaction.findFirst({
                    where: { userId: input.userId },
                    orderBy: { createdAt: 'desc' },
                    select: { balanceAfter: true },
                })
                const balanceBefore = latest?.balanceAfter ?? 0
                const balanceAfter = balanceBefore + input.amount

                return tx.creditTransaction.create({
                    data: {
                        userId: input.userId,
                        amount: input.amount,
                        balanceAfter,
                        type: input.type as CreditTransactionType,
                        status: CreditTransactionStatus.COMPLETED,
                        referenceType: input.referenceType ?? null,
                        referenceId: input.referenceId ?? null,
                    },
                    select: {
                        id: true,
                        userId: true,
                        amount: true,
                        balanceAfter: true,
                        type: true,
                        status: true,
                        referenceType: true,
                        referenceId: true,
                        createdAt: true,
                    },
                })
            })
        } catch (error) {
            throw handleRepositoryError(error)
        }
    }
}
