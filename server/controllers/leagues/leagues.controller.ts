import { ApiError } from '../../errors/api.error'
import type { ILeaguesService } from '../../services/leagues/leagues.service.interface'
import type { ILeaguesController } from './leagues.controller.interface'

export class LeaguesController implements ILeaguesController {
    private readonly leaguesService: ILeaguesService

    constructor(leaguesService: ILeaguesService) {
        this.leaguesService = leaguesService
    }

    async list(): Promise<Response> {
        try {
            const items = this.leaguesService.listLeagues()
            return Response.json(items)
        } catch (error) {
            return this.handleError(error)
        }
    }

    private handleError(error: unknown): Response {
        if (error instanceof ApiError) {
            return error.toResponse()
        }

        console.error('[LeaguesController]', error)
        return ApiError.internal().toResponse()
    }
}
