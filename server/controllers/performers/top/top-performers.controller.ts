import { ApiError } from '../../../errors/api.error'
import { ErrorCode } from '../../../errors/error-code.enum'
import { topPerformersQuerySchema } from '../../../entities/performers/top.schema'
import {
    ProviderError,
    ProviderNotConfiguredError,
    ProviderNotFoundError,
    ProviderUnavailableError,
} from '../../../providers/sports-provider.error'
import type { ITopPerformersService } from '../../../services/performers/top/top-performers.service.interface'
import type { ITopPerformersController } from './top-performers.controller.interface'

export class TopPerformersController implements ITopPerformersController {
    private readonly topPerformersService: ITopPerformersService

    constructor(topPerformersService: ITopPerformersService) {
        this.topPerformersService = topPerformersService
    }

    async list(searchParams: URLSearchParams): Promise<Response> {
        try {
            const result = topPerformersQuerySchema.safeParse(Object.fromEntries(searchParams))
            if (!result.success) {
                return ApiError.validationError(result.error.issues[0].message).toResponse()
            }

            const items = await this.topPerformersService.listTop(result.data)
            return Response.json(items)
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

        console.error('[TopPerformersController]', error)
        return ApiError.internal().toResponse()
    }
}
