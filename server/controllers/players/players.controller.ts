import { ApiError } from '../../errors/api.error'
import { ErrorCode } from '../../errors/error-code.enum'
import {
    listPlayersQuerySchema,
    playerIdParamSchema,
} from '../../entities/players/players.schema'
import type { ProviderPlayerFilters } from '../../providers/dto/provider-player.dto'
import {
    ProviderError,
    ProviderNotConfiguredError,
    ProviderNotFoundError,
    ProviderUnavailableError,
} from '../../providers/sports-provider.error'
import type { IPlayersService } from '../../services/players/players.service.interface'
import type { IPlayersController } from './players.controller.interface'

export class PlayersController implements IPlayersController {
    private readonly playersService: IPlayersService

    constructor(playersService: IPlayersService) {
        this.playersService = playersService
    }

    async list(searchParams: URLSearchParams): Promise<Response> {
        try {
            const result = listPlayersQuerySchema.safeParse(Object.fromEntries(searchParams))
            if (!result.success) {
                return ApiError.validationError(result.error.issues[0].message).toResponse()
            }

            const page = await this.playersService.listPlayers(result.data as ProviderPlayerFilters)
            return Response.json(page)
        } catch (error) {
            return this.handleError(error)
        }
    }

    async getById(idParam: string): Promise<Response> {
        try {
            const parsed = playerIdParamSchema.safeParse(idParam)
            if (!parsed.success) {
                return ApiError.validationError('id must be a positive integer').toResponse()
            }

            const player = await this.playersService.getPlayerById(parsed.data)
            if (!player) {
                return ApiError.notFound(
                    ErrorCode.PLAYER_NOT_FOUND,
                    `Player not found: ${parsed.data}`,
                ).toResponse()
            }

            return Response.json(player)
        } catch (error) {
            return this.handleError(error)
        }
    }

    private handleError(error: unknown): Response {
        if (error instanceof ProviderNotFoundError) {
            return ApiError.notFound(ErrorCode.PLAYER_NOT_FOUND, error.message).toResponse()
        }
        if (error instanceof ProviderNotConfiguredError) {
            return ApiError.serviceUnavailable(
                ErrorCode.PROVIDER_NOT_CONFIGURED,
                error.message,
            ).toResponse()
        }
        if (error instanceof ProviderUnavailableError) {
            return ApiError.serviceUnavailable(
                ErrorCode.PROVIDER_UNAVAILABLE,
                error.message,
            ).toResponse()
        }
        if (error instanceof ProviderError) {
            return ApiError.badGateway(ErrorCode.PROVIDER_ERROR, error.message).toResponse()
        }
        if (error instanceof ApiError) {
            return error.toResponse()
        }

        console.error('[PlayersController]', error)
        return ApiError.internal().toResponse()
    }
}
