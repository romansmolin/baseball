import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AIBillingService, type AIBillingPrisma } from '../ai-billing.service'
import { InsufficientCreditsError } from '../errors'

interface StoredTxn {
    id: string
    userId: string
    amount: number
    balanceAfter: number
    status: string
    referenceId: string | null
}

interface StoredLog {
    id: string
    userId: string
    featureId: string
    costCredits: number
    transactionId: string | null
    status: string
}

const makePrisma = (initialBalance: number) => {
    const txns: StoredTxn[] = []
    const logs: StoredLog[] = []
    if (initialBalance > 0) {
        txns.push({
            id: 'seed-txn',
            userId: 'u1',
            amount: initialBalance,
            balanceAfter: initialBalance,
            status: 'COMPLETED',
            referenceId: null,
        })
    }
    const surface: AIBillingPrisma = {
        async $transaction<T>(
            fn: (tx: AIBillingPrisma) => Promise<T>,
        ): Promise<T> {
            return fn(surface)
        },
        creditTransaction: {
            async findFirst({ where }: { where: { userId: string } }) {
                const matches = txns
                    .filter((t) => t.userId === where.userId)
                    .sort((a, b) => txns.indexOf(b) - txns.indexOf(a))
                return matches.length > 0
                    ? { balanceAfter: matches[0].balanceAfter }
                    : null
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            async create({ data }: { data: any }) {
                const id = `txn-${txns.length + 1}`
                const stored: StoredTxn = {
                    id,
                    userId: data.userId,
                    amount: data.amount,
                    balanceAfter: data.balanceAfter,
                    status: String(data.status),
                    referenceId: (data.referenceId as string | null) ?? null,
                }
                txns.push(stored)
                return { id, balanceAfter: stored.balanceAfter }
            },
        },
        aIUsageLog: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            async create({ data }: { data: any }) {
                const id = `log-${logs.length + 1}`
                logs.push({
                    id,
                    userId: data.userId,
                    featureId: data.featureId,
                    costCredits: data.costCredits as number,
                    transactionId: (data.transactionId as string | null) ?? null,
                    status: String(data.status),
                })
                return { id }
            },
        },
        // Inserted for test inspection — not on AIBillingPrisma interface
    } as unknown as AIBillingPrisma & { __txns: StoredTxn[]; __logs: StoredLog[] }
    ;(surface as unknown as { __txns: StoredTxn[]; __logs: StoredLog[] }).__txns = txns
    ;(surface as unknown as { __logs: StoredLog[] }).__logs = logs
    return surface
}

describe('AIBillingService', () => {
    let prisma: AIBillingPrisma & { __txns: StoredTxn[]; __logs: StoredLog[] }

    beforeEach(() => {
        prisma = makePrisma(100) as never
    })

    describe('preCheck', () => {
        it('returns balance when sufficient', async () => {
            const svc = new AIBillingService(prisma)
            await expect(svc.preCheck('u1', 20)).resolves.toEqual({ balance: 100 })
        })

        it('throws InsufficientCreditsError when balance < cost', async () => {
            const svc = new AIBillingService(prisma)
            await expect(svc.preCheck('u1', 200)).rejects.toBeInstanceOf(
                InsufficientCreditsError,
            )
        })

        it('treats absent ledger as zero balance', async () => {
            const empty = makePrisma(0)
            const svc = new AIBillingService(empty)
            await expect(svc.preCheck('u1', 1)).rejects.toBeInstanceOf(
                InsufficientCreditsError,
            )
        })
    })

    describe('commit', () => {
        it('writes a CreditTransaction and AIUsageLog linked by transactionId', async () => {
            const svc = new AIBillingService(prisma)
            const result = await svc.commit({
                userId: 'u1',
                featureId: 'feat-mp',
                featureKey: 'matchup_predictor',
                costCredits: 5,
                tokenUsage: { inputTokens: 100, outputTokens: 50 },
            })
            expect(result.balanceAfter).toBe(95)
            expect(prisma.__txns).toHaveLength(2)
            expect(prisma.__txns[1]).toMatchObject({
                amount: -5,
                balanceAfter: 95,
                status: 'COMPLETED',
            })
            expect(prisma.__logs).toHaveLength(1)
            expect(prisma.__logs[0]).toMatchObject({
                status: 'COMPLETED',
                costCredits: 5,
                transactionId: result.transactionId,
            })
        })

        it('re-checks balance inside the transaction and rejects if depleted', async () => {
            const svc = new AIBillingService(prisma)
            // simulate a depleted balance via direct mutation
            prisma.__txns.push({
                id: 'racer',
                userId: 'u1',
                amount: -99,
                balanceAfter: 1,
                status: 'COMPLETED',
                referenceId: null,
            })
            await expect(
                svc.commit({
                    userId: 'u1',
                    featureId: 'feat-mp',
                    featureKey: 'matchup_predictor',
                    costCredits: 5,
                    tokenUsage: { inputTokens: 0, outputTokens: 0 },
                }),
            ).rejects.toBeInstanceOf(InsufficientCreditsError)
        })

        it('balanceAfter math is correct over a sequence of commits', async () => {
            const svc = new AIBillingService(prisma)
            await svc.commit({
                userId: 'u1',
                featureId: 'feat-mp',
                featureKey: 'matchup_predictor',
                costCredits: 5,
                tokenUsage: { inputTokens: 0, outputTokens: 0 },
            })
            await svc.commit({
                userId: 'u1',
                featureId: 'feat-mp',
                featureKey: 'matchup_predictor',
                costCredits: 10,
                tokenUsage: { inputTokens: 0, outputTokens: 0 },
            })
            const final = prisma.__txns.at(-1)!
            expect(final.balanceAfter).toBe(85)
        })
    })

    describe('recordFailure', () => {
        it('writes FAILED log + zero-amount FAILED transaction (no charge)', async () => {
            const svc = new AIBillingService(prisma)
            const { usageLogId } = await svc.recordFailure({
                userId: 'u1',
                featureId: 'feat-mp',
            })
            const lastTxn = prisma.__txns.at(-1)!
            expect(lastTxn.amount).toBe(0)
            expect(lastTxn.status).toBe('FAILED')
            expect(lastTxn.balanceAfter).toBe(100)
            const log = prisma.__logs.find((l) => l.id === usageLogId)!
            expect(log.status).toBe('FAILED')
            expect(log.costCredits).toBe(0)
        })
    })

    describe('getBalance', () => {
        it('reads the most-recent balanceAfter', async () => {
            const svc = new AIBillingService(prisma)
            await svc.commit({
                userId: 'u1',
                featureId: 'feat-mp',
                featureKey: 'matchup_predictor',
                costCredits: 7,
                tokenUsage: { inputTokens: 0, outputTokens: 0 },
            })
            await expect(svc.getBalance('u1')).resolves.toBe(93)
        })
    })
})
