import { compareQuerySchema, playerAnalyticsQuerySchema } from '../../entities/analytics/analytics.schema'
import { playerIdParamSchema } from '../../entities/players/players.schema'
import { ApiError } from '../../errors/api.error'
import { ErrorCode } from '../../errors/error-code.enum'
import { env } from '../../lib/env'
import type { IAnalyticsService } from '../../services/analytics/analytics.service.interface'
import { errorResponse } from '../provider-error.response'

import type { IAnalyticsController } from './analytics.controller.interface'

export class AnalyticsController implements IAnalyticsController {
    private readonly analyticsService: IAnalyticsService

    constructor(analyticsService: IAnalyticsService) {
        this.analyticsService = analyticsService
    }

    async getPlayerAnalytics(idParam: string, searchParams: URLSearchParams): Promise<Response> {
        try {
            const id = playerIdParamSchema.safeParse(idParam)
            if (!id.success) {
                return ApiError.validationError('id must be a positive integer').toResponse()
            }
            const query = playerAnalyticsQuerySchema.safeParse(Object.fromEntries(searchParams))
            if (!query.success) {
                return ApiError.validationError(query.error.issues[0].message).toResponse()
            }

            const analytics = await this.analyticsService.getPlayerAnalytics(
                id.data,
                query.data.season ?? env.defaultSeason(),
                query.data.league,
            )
            if (!analytics) {
                return ApiError.notFound(ErrorCode.PLAYER_NOT_FOUND, `Player not found: ${id.data}`).toResponse()
            }
            return Response.json(analytics)
        } catch (error) {
            return errorResponse(error, ErrorCode.PLAYER_NOT_FOUND, 'AnalyticsController')
        }
    }

    async comparePlayers(searchParams: URLSearchParams): Promise<Response> {
        try {
            const query = compareQuerySchema.safeParse(Object.fromEntries(searchParams))
            if (!query.success) {
                return ApiError.validationError(query.error.issues[0].message).toResponse()
            }

            const result = await this.analyticsService.comparePlayers(
                query.data.ids,
                query.data.season ?? env.defaultSeason(),
            )
            return Response.json(result)
        } catch (error) {
            return errorResponse(error, ErrorCode.PLAYER_NOT_FOUND, 'AnalyticsController')
        }
    }
}
