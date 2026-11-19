import { ApiError } from '../../../../../../server/errors/api.error'
import { getSportsProvider } from '../../../../../../server/providers/sports-provider.factory'
import { prisma } from '../../../../../../server/lib/prisma'
import { AIBillingService } from '../../../../../../server/services/ai/ai-billing.service'
import {
    PerformerAnalyticsFeature,
    performerAnalyticsInputSchema,
} from '../../../../../../server/services/ai/features/performer-analytics.feature'
import { AIFeatureRepository } from '../../../../../../server/services/ai/repositories/ai-feature.repository'
import { AIFeatureService } from '../../../../../../server/services/ai/services/ai-feature.service'
import { PerformersService } from '../../../../../../server/services/performers/performers.service'
import { getAuthenticatedUser } from '../../../../../../server/shared/auth.utils'

export async function POST(request: Request) {
    const user = await getAuthenticatedUser()
    if (!user) return ApiError.unauthorized().toResponse()

    let body: unknown
    try {
        body = await request.json()
    } catch {
        return ApiError.validationError('Invalid JSON body').toResponse()
    }

    const parsed = performerAnalyticsInputSchema.safeParse(body)
    if (!parsed.success) {
        return ApiError.validationError(parsed.error.issues[0]?.message ?? 'Invalid input').toResponse()
    }

    try {
        const orchestrator = new AIFeatureService(new AIFeatureRepository(), new AIBillingService(prisma))
        const feature = new PerformerAnalyticsFeature(new PerformersService(getSportsProvider()))
        const result = await orchestrator.invoke(user.id, feature, parsed.data)
        return Response.json({ output: result.output })
    } catch (error) {
        if (error instanceof ApiError) return error.toResponse()
        console.error('[performer analytics route]', error)
        return ApiError.internal().toResponse()
    }
}
