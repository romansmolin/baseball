import { ErrorCode } from './error-code.enum'

export class ApiError extends Error {
    constructor(
        public readonly statusCode: number,
        public readonly code: ErrorCode,
        message: string,
    ) {
        super(message)
        this.name = 'ApiError'
    }

    toResponse(): Response {
        return Response.json(
            { error: { code: this.code, message: this.message } },
            { status: this.statusCode },
        )
    }

    static validationError(message: string): ApiError {
        return new ApiError(400, ErrorCode.VALIDATION_ERROR, message)
    }

    static notFound(code: ErrorCode, message: string): ApiError {
        return new ApiError(404, code, message)
    }

    static conflict(code: ErrorCode, message: string): ApiError {
        return new ApiError(409, code, message)
    }

    static internal(message = 'Internal server error'): ApiError {
        return new ApiError(500, ErrorCode.INTERNAL_ERROR, message)
    }
}
