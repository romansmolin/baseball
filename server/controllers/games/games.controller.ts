import { gameLeagueSchema, gamePkParamSchema } from '../../entities/analytics/analytics.schema'
import { ApiError } from '../../errors/api.error'
import { ErrorCode } from '../../errors/error-code.enum'
import type { IGamesService } from '../../services/games/games.service.interface'

import { errorResponse } from '../provider-error.response'

import type { IGamesController } from './games.controller.interface'

const DEFAULT_LIMIT = 6
const MAX_LIMIT = 30

export class GamesController implements IGamesController {
    private readonly gamesService: IGamesService

    constructor(gamesService: IGamesService) {
        this.gamesService = gamesService
    }

    async getUpcomingGames(searchParams: URLSearchParams): Promise<Response> {
        try {
            const limit = clampLimit(searchParams.get('limit'))
            const games = await this.gamesService.getUpcomingGames(limit)
            return Response.json(games)
        } catch (error) {
            if (error instanceof ApiError) return error.toResponse()
            console.error('[GamesController]', error)
            return ApiError.internal().toResponse()
        }
    }

    async getGameDetail(gamePkParam: string, leagueParam: string | null): Promise<Response> {
        try {
            const gamePk = gamePkParamSchema.safeParse(gamePkParam)
            if (!gamePk.success) {
                return ApiError.validationError('gamePk must be a positive integer').toResponse()
            }

            const league = gameLeagueSchema.safeParse(leagueParam ?? undefined)
            if (!league.success) {
                return ApiError.validationError('league must be mlb or winter-leagues').toResponse()
            }

            const detail = await this.gamesService.getGameDetail(gamePk.data, league.data)
            if (!detail) {
                return ApiError.notFound(ErrorCode.GAME_NOT_FOUND, `Game not found: ${gamePk.data}`).toResponse()
            }
            return Response.json(detail)
        } catch (error) {
            return errorResponse(error, ErrorCode.GAME_NOT_FOUND, 'GamesController')
        }
    }
}

function clampLimit(raw: string | null): number {
    if (raw == null) return DEFAULT_LIMIT
    const parsed = Number.parseInt(raw, 10)
    if (Number.isNaN(parsed) || parsed < 1) return DEFAULT_LIMIT
    return Math.min(MAX_LIMIT, parsed)
}
