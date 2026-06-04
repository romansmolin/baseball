import { z } from 'zod'

import { ApiError } from '../../../../../../server/errors/api.error'
import { getSportsProvider } from '../../../../../../server/providers/sports-provider.factory'
import { prisma } from '../../../../../../server/lib/prisma'
import { FantasyTeamRepository } from '../../../../../../server/repositories/fantasy-team/fantasy-team.repository'
import { LeagueMemberRepository } from '../../../../../../server/repositories/league-member/league-member.repository'
import { LeagueRepository } from '../../../../../../server/repositories/league/league.repository'
import { ScoringRuleRepository } from '../../../../../../server/repositories/scoring-rule/scoring-rule.repository'
import { AIBillingService } from '../../../../../../server/services/ai/ai-billing.service'
import { TradeAdvisorFeature } from '../../../../../../server/services/ai/features/trade-advisor.feature'
import { OpenAIProvider } from '../../../../../../server/services/ai/provider/openai.provider'
import { AIFeatureRepository } from '../../../../../../server/services/ai/repositories/ai-feature.repository'
import { AIFeatureService } from '../../../../../../server/services/ai/services/ai-feature.service'
import { getAuthenticatedUser } from '../../../../../../server/shared/auth.utils'

function buildOrchestrator() {
    const featureRepo = new AIFeatureRepository()
    const billing = new AIBillingService(prisma)
    const orchestrator = new AIFeatureService(featureRepo, billing)
    const feature = new TradeAdvisorFeature(
        new OpenAIProvider(),
        getSportsProvider(),
        new LeagueRepository(),
        new LeagueMemberRepository(),
        new ScoringRuleRepository(),
        new FantasyTeamRepository(),
    )
    return { orchestrator, feature }
}

const requestSchema = z.object({
    leagueId: z.string().min(1),
    giving: z.array(z.string().min(1)).min(1),
    receiving: z.array(z.string().min(1)).min(1),
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
