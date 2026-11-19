import { ApiError } from '../errors/api.error'
import { ErrorCode } from '../errors/error-code.enum'
import {
    ProviderError,
    ProviderNotConfiguredError,
    ProviderNotFoundError,
    ProviderUnavailableError,
} from '../providers/sports-provider.error'

// Maps a failed data-provider call (or any other error) to the shared error response shape.
export function errorResponse(error: unknown, notFoundCode: ErrorCode, source: string): Response {
    if (error instanceof ProviderNotFoundError) {
        return ApiError.notFound(notFoundCode, error.message).toResponse()
    }
    if (error instanceof ProviderNotConfiguredError) {
        return ApiError.serviceUnavailable(ErrorCode.PROVIDER_NOT_CONFIGURED, error.message).toResponse()
    }
    if (error instanceof ProviderUnavailableError) {
        return ApiError.serviceUnavailable(ErrorCode.PROVIDER_UNAVAILABLE, error.message).toResponse()
    }
    if (error instanceof ProviderError) {
        return ApiError.badGateway(ErrorCode.PROVIDER_ERROR, error.message).toResponse()
    }
    if (error instanceof ApiError) {
        return error.toResponse()
    }

    console.error(`[${source}]`, error)
    return ApiError.internal().toResponse()
}
