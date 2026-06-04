// Orchestrates a single AI feature invocation:
//   1. look up AIFeature row, enforce isActive
//   2. preCheck balance
//   3. delegate context fetch + prompt build + provider call to the feature
//   4. on success → billing.commit
//   5. on failure (anywhere after preCheck) → billing.recordFailure + rethrow
//
// Features themselves are small modules implementing AIFeatureModule<I, O>.
// They receive an OpenAIProvider in their constructor so tests can swap it.

import { FeatureDisabledError, FeatureNotFoundError } from '../errors'
import { aiLog, aiLogError } from '../logger'
import type {
    AIFeatureModule,
    AIFeatureKey,
    AIInvocationResult,
} from '../types'
import type { IAIBillingService } from '../ai-billing.service'
import type { IAIFeatureRepository } from '../repositories/ai-feature.repository'

export interface IAIFeatureService {
    invoke<TInput, TOutput>(
        userId: string,
        feature: AIFeatureModule<TInput, TOutput>,
        input: TInput,
    ): Promise<AIInvocationResult<TOutput>>
}

export class AIFeatureService implements IAIFeatureService {
    private readonly featureRepo: IAIFeatureRepository
    private readonly billing: IAIBillingService

    constructor(featureRepo: IAIFeatureRepository, billing: IAIBillingService) {
        this.featureRepo = featureRepo
        this.billing = billing
    }

    async invoke<TInput, TOutput>(
        userId: string,
        feature: AIFeatureModule<TInput, TOutput>,
        input: TInput,
    ): Promise<AIInvocationResult<TOutput>> {
        const t0 = Date.now()
        aiLog('orchestrator.invoke.start', { featureKey: feature.key, userId })

        const record = await this.featureRepo.findByKey(feature.key)
        if (!record) {
            aiLog('orchestrator.feature.not_found', { featureKey: feature.key })
            throw new FeatureNotFoundError(feature.key)
        }
        if (!record.isActive) {
            aiLog('orchestrator.feature.disabled', {
                featureKey: feature.key,
                featureId: record.id,
            })
            throw new FeatureDisabledError(feature.key)
        }
        aiLog('orchestrator.feature.loaded', {
            featureKey: feature.key,
            featureId: record.id,
            costCredits: record.costCredits,
        })

        // preCheck throws InsufficientCreditsError on its own — no charge
        // is recorded for a preCheck rejection (the failure here is the
        // user's lack of credits, not a provider failure).
        await this.billing.preCheck(userId, record.costCredits)
        aiLog('orchestrator.precheck.ok', {
            userId,
            costCredits: record.costCredits,
        })

        let result: AIInvocationResult<TOutput>
        try {
            result = await feature.invoke(userId, input)
        } catch (cause) {
            aiLogError('orchestrator.feature.invoke_failed', cause, {
                featureKey: feature.key,
                userId,
                elapsedMs: Date.now() - t0,
            })
            // Anything after preCheck — context fetch, provider call, schema
            // validation — counts as a failed invocation we audit but don't
            // charge for.
            await this.billing
                .recordFailure({ userId, featureId: record.id })
                .catch((auditErr) => {
                    aiLogError('orchestrator.recordFailure.errored', auditErr)
                    // Swallow audit-write failure; the real error wins.
                })
            throw cause
        }

        await this.billing.commit({
            userId,
            featureId: record.id,
            featureKey: feature.key as AIFeatureKey,
            costCredits: record.costCredits,
            tokenUsage: result.tokenUsage,
        })
        aiLog('orchestrator.invoke.ok', {
            featureKey: feature.key,
            userId,
            elapsedMs: Date.now() - t0,
            tokenUsage: result.tokenUsage,
            modelUsed: result.modelUsed,
        })

        return result
    }
}
