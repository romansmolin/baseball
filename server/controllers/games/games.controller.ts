import { ApiError } from '../../errors/api.error'
import type { IGamesService } from '../../services/games/games.service.interface'

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
}

function clampLimit(raw: string | null): number {
    if (raw == null) return DEFAULT_LIMIT
    const parsed = Number.parseInt(raw, 10)
    if (Number.isNaN(parsed) || parsed < 1) return DEFAULT_LIMIT
    return Math.min(MAX_LIMIT, parsed)
}
