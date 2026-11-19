import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import type { IAIBillingService } from '../ai-billing.service'
import { InsufficientCreditsError } from '../errors'
import type { IAIFeatureRepository } from '../repositories/ai-feature.repository'
import { AIFeatureService } from '../services/ai-feature.service'
import type { AIFeatureModule } from '../types'

const record = { id: 'f1', key: 'game_picks', costCredits: 20, modelName: 'm', isActive: true }

const repo = (): IAIFeatureRepository =>
    ({ findByKey: vi.fn().mockResolvedValue(record) }) as unknown as IAIFeatureRepository

const billing = (overrides: Partial<IAIBillingService> = {}): IAIBillingService => ({
    getBalance: vi.fn(),
    preCheck: vi.fn().mockResolvedValue({ balance: 100 }),
    commit: vi.fn().mockResolvedValue({ transactionId: 't', usageLogId: 'u', balanceAfter: 80 }),
    recordFailure: vi.fn().mockResolvedValue({ usageLogId: 'u' }),
    ...overrides,
})

const feature = (invoke: AIFeatureModule<unknown, unknown>['invoke']): AIFeatureModule<unknown, unknown> => ({
    key: 'game_picks',
    inputSchema: z.unknown(),
    outputSchema: z.unknown(),
    invoke,
})

const okResult = { output: {}, tokenUsage: { inputTokens: 1, outputTokens: 1 }, modelUsed: 'm' }

describe('AIFeatureService charging', () => {
    it('never runs the feature and never charges when the balance is too low', async () => {
        const invoke = vi.fn()
        const b = billing({ preCheck: vi.fn().mockRejectedValue(new InsufficientCreditsError(20, 5)) })

        await expect(new AIFeatureService(repo(), b).invoke('u1', feature(invoke), {})).rejects.toBeInstanceOf(
            InsufficientCreditsError,
        )

        expect(invoke).not.toHaveBeenCalled()
        expect(b.commit).not.toHaveBeenCalled()
        expect(b.recordFailure).not.toHaveBeenCalled()
    })

    it('does not charge when the feature fails after the balance check, and records the failure', async () => {
        const b = billing()

        await expect(
            new AIFeatureService(repo(), b).invoke('u1', feature(vi.fn().mockRejectedValue(new Error('model down'))), {}),
        ).rejects.toThrow('model down')

        expect(b.commit).not.toHaveBeenCalled()
        expect(b.recordFailure).toHaveBeenCalledWith({ userId: 'u1', featureId: 'f1' })
    })

    it('charges the feature cost once on success', async () => {
        const b = billing()

        await new AIFeatureService(repo(), b).invoke('u1', feature(vi.fn().mockResolvedValue(okResult)), {})

        expect(b.commit).toHaveBeenCalledTimes(1)
        expect(b.commit).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', costCredits: 20 }))
    })
})
