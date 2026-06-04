import { z } from 'zod'

import { ApiError } from '../../../../../../server/errors/api.error'
import { getSportsProvider } from '../../../../../../server/providers/sports-provider.factory'
import { prisma } from '../../../../../../server/lib/prisma'
import { AIBillingService } from '../../../../../../server/services/ai/ai-billing.service'
import { MatchupPredictorFeature } from '../../../../../../server/services/ai/features/matchup-predictor.feature'
import { OpenAIProvider } from '../../../../../../server/services/ai/provider/openai.provider'
import { AIFeatureRepository } from '../../../../../../server/services/ai/repositories/ai-feature.repository'
import { AIFeatureService } from '../../../../../../server/services/ai/services/ai-feature.service'
import { getAuthenticatedUser } from '../../../../../../server/shared/auth.utils'

// Lazy-instantiate so a misconfigured AI env doesn't crash unrelated routes
// at module load.
function buildOrchestrator() {
    const featureRepo = new AIFeatureRepository()
    const billing = new AIBillingService(prisma)
    const orchestrator = new AIFeatureService(featureRepo, billing)
    const feature = new MatchupPredictorFeature(
        new OpenAIProvider(),
        getSportsProvider(),
    )
    return { orchestrator, feature }
}

const requestSchema = z.object({
    externalGameId: z.string().min(1),
})

export async function POST(request: Request) {
    const user = await getAuthenticatedUser()
    if (!user) return ApiError.unauthorized().toResponse()

    let body: unknown
    try {
        body = await request.json()
    } catch {
        return ApiError.validationError('Invalid JSON body').toResponse()
    }

    const parsed = requestSchema.safeParse(body)
    if (!parsed.success) {
        return ApiError.validationError(
            parsed.error.issues[0]?.message ?? 'Invalid input',
        ).toResponse()
    }

    try {
        const { orchestrator, feature } = buildOrchestrator()
        const result = await orchestrator.invoke(user.id, feature, parsed.data)
        return Response.json({
            output: result.output,
            modelUsed: result.modelUsed,
            tokenUsage: result.tokenUsage,
        })
    } catch (error) {
        if (error instanceof ApiError) return error.toResponse()
        return ApiError.internal(
            error instanceof Error ? error.message : 'Unexpected AI error',
        ).toResponse()
    }
}
