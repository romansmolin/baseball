import { joinTournamentSchema } from '../../../entities/tournaments/joins.schema'
import { ApiError } from '../../../errors/api.error'
import type { ITournamentsJoinsService } from '../../../services/tournaments/joins/tournaments-joins.service.interface'

import type { ITournamentsJoinsController } from './tournaments-joins.controller.interface'

export class TournamentsJoinsController implements ITournamentsJoinsController {
    private readonly tournamentsJoinsService: ITournamentsJoinsService

    constructor(tournamentsJoinsService: ITournamentsJoinsService) {
        this.tournamentsJoinsService = tournamentsJoinsService
    }

    async joinTournament(
        body: unknown,
        tournamentId: string,
        userId: string,
    ): Promise<Response> {
        try {
            const result = joinTournamentSchema.safeParse(body)
            if (!result.success) {
                return ApiError.validationError(result.error.issues[0].message).toResponse()
            }

            const joined = await this.tournamentsJoinsService.joinTournament({
                tournamentId,
                userId,
                fantasyTeamId: result.data.fantasyTeamId,
            })

            return Response.json(joined, { status: 201 })
        } catch (error) {
            return this.handleError(error)
        }
    }

    private handleError(error: unknown): Response {
        if (error instanceof ApiError) {
            return error.toResponse()
        }

        console.error('[TournamentsJoinsController]', error)
        return ApiError.internal().toResponse()
    }
}
