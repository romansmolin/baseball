import { tbAutofillInputSchema } from '../../../../../../server/entities/ai/team-builder-autofill.schema'
import { ApiError } from '../../../../../../server/errors/api.error'
import { prisma } from '../../../../../../server/lib/prisma'
import { AIBillingService } from '../../../../../../server/services/ai/ai-billing.service'
import { TeamBuilderAutofillFeature } from '../../../../../../server/services/ai/features/team-builder-autofill.feature'
import { aiLog, aiLogError } from '../../../../../../server/services/ai/logger'
import { OpenAIProvider } from '../../../../../../server/services/ai/provider/openai.provider'
import { AIFeatureRepository } from '../../../../../../server/services/ai/repositories/ai-feature.repository'
import { AIFeatureService } from '../../../../../../server/services/ai/services/ai-feature.service'
import { buildProjectionsService } from '../../../../../../server/services/projections/projections.composition'
import { getAuthenticatedUser } from '../../../../../../server/shared/auth.utils'

function buildOrchestrator() {
    const featureRepo = new AIFeatureRepository()
    const billing = new AIBillingService(prisma)
    const orchestrator = new AIFeatureService(featureRepo, billing)
    const feature = new TeamBuilderAutofillFeature(
        new OpenAIProvider(),
        buildProjectionsService(),
    )
    return { orchestrator, feature }
}

export async function POST(request: Request) {
    const t0 = Date.now()
    aiLog('route.team-builder-autofill.received')

    const user = await getAuthenticatedUser()
    if (!user) {
        aiLog('route.team-builder-autofill.unauthorized')
        return ApiError.unauthorized().toResponse()
    }

    let body: unknown
    try {
        body = await request.json()
    } catch {
        aiLog('route.team-builder-autofill.bad_json')
        return ApiError.validationError('Invalid JSON body').toResponse()
    }

    const parsed = tbAutofillInputSchema.safeParse(body)
    if (!parsed.success) {
        aiLog('route.team-builder-autofill.validation_failed', {
            issue: parsed.error.issues[0]?.message,
            path: parsed.error.issues[0]?.path,
        })
        return ApiError.validationError(
            parsed.error.issues[0]?.message ?? 'Invalid input',
        ).toResponse()
    }

    aiLog('route.team-builder-autofill.invoking', {
        userId: user.id,
        mlbTeamIds: parsed.data.mlbTeamIds,
        format: parsed.data.format,
        period: parsed.data.period,
        filledSlotCount: parsed.data.filledSlots?.length ?? 0,
    })

    try {
        const { orchestrator, feature } = buildOrchestrator()
        const result = await orchestrator.invoke(user.id, feature, {
            ...parsed.data,
            filledSlots: parsed.data.filledSlots ?? [],
        })
        aiLog('route.team-builder-autofill.ok', {
            userId: user.id,
            elapsedMs: Date.now() - t0,
            modelUsed: result.modelUsed,
            tokenUsage: result.tokenUsage,
        })
        return Response.json({
            output: result.output,
            modelUsed: result.modelUsed,
            tokenUsage: result.tokenUsage,
        })
    } catch (error) {
        aiLogError('route.team-builder-autofill.failed', error, {
            userId: user.id,
            elapsedMs: Date.now() - t0,
        })
        if (error instanceof ApiError) return error.toResponse()
        console.error('[ai route]', error)
        return ApiError.internal().toResponse()
    }
}
