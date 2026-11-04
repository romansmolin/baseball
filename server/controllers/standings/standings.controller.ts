import { ApiError } from '../../errors/api.error'
import { ErrorCode } from '../../errors/error-code.enum'
import { standingsQuerySchema } from '../../entities/standings/standings.schema'
import { ProviderError, ProviderUnavailableError } from '../../providers/sports-provider.error'
import type { IStandingsService } from '../../services/standings/standings.service.interface'
import type { IStandingsController } from './standings.controller.interface'

export class StandingsController implements IStandingsController {
    private readonly standingsService: IStandingsService

    constructor(standingsService: IStandingsService) {
        this.standingsService = standingsService
    }

    async get(searchParams: URLSearchParams): Promise<Response> {
        try {
            const result = standingsQuerySchema.safeParse(Object.fromEntries(searchParams))
            if (!result.success) return ApiError.validationError('Choose a league from the list').toResponse()
            return Response.json(await this.standingsService.getStandings(result.data.league))
        } catch (error) {
            if (error instanceof ApiError) return error.toResponse()
            if (error instanceof ProviderUnavailableError || error instanceof ProviderError) {
                return ApiError.badGateway(ErrorCode.PROVIDER_ERROR, error.message).toResponse()
            }
            console.error('[StandingsController]', error)
            return ApiError.internal().toResponse()
        }
    }
}
