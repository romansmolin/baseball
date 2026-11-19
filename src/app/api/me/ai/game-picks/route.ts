import { ApiError } from '../../../../../../server/errors/api.error'
import { getSportsProvider } from '../../../../../../server/providers/sports-provider.factory'
import { fetchSavantExpectedStats } from '../../../../../../server/providers/savant/savant.client'
import { prisma } from '../../../../../../server/lib/prisma'
import { FantasyTeamRepository } from '../../../../../../server/repositories/fantasy-team/fantasy-team.repository'
import { AIBillingService } from '../../../../../../server/services/ai/ai-billing.service'
import {
    GamePicksFeature,
    gamePicksInputSchema,
} from '../../../../../../server/services/ai/features/game-picks.feature'
import { OpenAIProvider } from '../../../../../../server/services/ai/provider/openai.provider'
import { AIFeatureRepository } from '../../../../../../server/services/ai/repositories/ai-feature.repository'
import { AIFeatureService } from '../../../../../../server/services/ai/services/ai-feature.service'
import { GamesService } from '../../../../../../server/services/games/games.service'
import { getAuthenticatedUser } from '../../../../../../server/shared/auth.utils'

// Built per request so a misconfigured AI env cannot crash unrelated routes at module load.
function buildOrchestrator() {
    const sportsProvider = getSportsProvider()
    const orchestrator = new AIFeatureService(new AIFeatureRepository(), new AIBillingService(prisma))
    const feature = new GamePicksFeature(
        new OpenAIProvider(),
        sportsProvider,
        new GamesService(sportsProvider),
        new FantasyTeamRepository(),
        fetchSavantExpectedStats,
    )
    return { orchestrator, feature }
}

export async function POST(request: Request) {
    const user = await getAuthenticatedUser()
    if (!user) return ApiError.unauthorized().toResponse()

    let body: unknown
    try {
        body = await request.json()
    } catch {
        return ApiError.validationError('Invalid JSON body').toResponse()
    }

    const parsed = gamePicksInputSchema.safeParse(body)
    if (!parsed.success) {
        return ApiError.validationError(parsed.error.issues[0]?.message ?? 'Invalid input').toResponse()
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
        return ApiError.internal(error instanceof Error ? error.message : 'Unexpected AI error').toResponse()
    }
}
