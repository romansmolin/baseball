import { ApiError } from '../../errors/api.error'
import { ErrorCode } from '../../errors/error-code.enum'
import {
    listTeamsQuerySchema,
    teamIdParamSchema,
    teamRosterQuerySchema,
} from '../../entities/teams/teams.schema'
import {
    ProviderNotConfiguredError,
    ProviderNotFoundError,
    ProviderUnavailableError,
    ProviderError,
} from '../../providers/sports-provider.error'
import type { ITeamsService } from '../../services/teams/teams.service.interface'
import type { ITeamsController } from './teams.controller.interface'

export class TeamsController implements ITeamsController {
    private readonly teamsService: ITeamsService

    constructor(teamsService: ITeamsService) {
        this.teamsService = teamsService
    }

    async list(searchParams: URLSearchParams): Promise<Response> {
        try {
            const result = listTeamsQuerySchema.safeParse(Object.fromEntries(searchParams))
            if (!result.success) {
                return ApiError.validationError(result.error.issues[0].message).toResponse()
            }

            const items = await this.teamsService.listTeams(result.data)
            return Response.json({ items })
        } catch (error) {
            return this.handleError(error)
        }
    }

    async getById(idParam: string): Promise<Response> {
        try {
            const parsed = teamIdParamSchema.safeParse(idParam)
            if (!parsed.success) {
                return ApiError.validationError('id must be a positive integer').toResponse()
            }

            const team = await this.teamsService.getTeamById(parsed.data)
            if (!team) {
                return ApiError.notFound(
                    ErrorCode.TEAM_NOT_FOUND,
                    `Team not found: ${parsed.data}`,
                ).toResponse()
            }

            return Response.json(team)
        } catch (error) {
            return this.handleError(error)
        }
    }

    async getRoster(idParam: string, searchParams: URLSearchParams): Promise<Response> {
        try {
            const parsedId = teamIdParamSchema.safeParse(idParam)
            if (!parsedId.success) {
                return ApiError.validationError('id must be a positive integer').toResponse()
            }

            const parsedQuery = teamRosterQuerySchema.safeParse(Object.fromEntries(searchParams))
            if (!parsedQuery.success) {
                return ApiError.validationError(parsedQuery.error.issues[0].message).toResponse()
            }

            const items = await this.teamsService.getTeamRoster(parsedId.data, parsedQuery.data)
            return Response.json({ items })
        } catch (error) {
            return this.handleError(error, ErrorCode.TEAM_NOT_FOUND)
        }
    }

    private handleError(error: unknown, notFoundCode: ErrorCode = ErrorCode.TEAM_NOT_FOUND): Response {
        if (error instanceof ProviderNotFoundError) {
            return ApiError.notFound(notFoundCode, error.message).toResponse()
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

        console.error('[TeamsController]', error)
        return ApiError.internal().toResponse()
    }
}
