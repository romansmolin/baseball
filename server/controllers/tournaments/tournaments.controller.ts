import { tournamentsListQuerySchema } from '../../entities/tournaments/tournaments.schema'
import { ApiError } from '../../errors/api.error'
import type { ITournamentsService } from '../../services/tournaments/tournaments.service.interface'

import type { ITournamentsController } from './tournaments.controller.interface'

export class TournamentsController implements ITournamentsController {
    private readonly tournamentsService: ITournamentsService

    constructor(tournamentsService: ITournamentsService) {
        this.tournamentsService = tournamentsService
    }

    async list(searchParams: URLSearchParams): Promise<Response> {
        try {
            const result = tournamentsListQuerySchema.safeParse(
                Object.fromEntries(searchParams),
            )
            if (!result.success) {
                return ApiError.validationError(result.error.issues[0].message).toResponse()
            }

            const payload = await this.tournamentsService.listTournaments({
                leagueSlug: result.data.leagueSlug,
                status: result.data.status,
                visibility: result.data.visibility,
                limit: result.data.limit,
                offset: result.data.offset,
            })
            return Response.json(payload)
        } catch (error) {
            return this.handleError(error)
        }
    }

    async findById(id: string): Promise<Response> {
        try {
            const tournament = await this.tournamentsService.getTournamentById(id)
            return Response.json(tournament)
        } catch (error) {
            return this.handleError(error)
        }
    }

    async getStandings(id: string): Promise<Response> {
        try {
            const standings = await this.tournamentsService.getTournamentStandings(id)
            return Response.json(standings)
        } catch (error) {
            return this.handleError(error)
        }
    }

    private handleError(error: unknown): Response {
        if (error instanceof ApiError) {
            return error.toResponse()
        }

        console.error('[TournamentsController]', error)
        return ApiError.internal().toResponse()
    }
}
