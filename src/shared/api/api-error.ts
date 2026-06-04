import { AxiosError } from 'axios'

interface ServerErrorPayload {
    error?: string | { code?: string; message?: string }
}

export class ApiError extends Error {
    readonly status: number
    readonly code: string | undefined
    readonly data: unknown

    constructor(status: number, message: string, data?: unknown, code?: string) {
        super(message)
        this.name = 'ApiError'
        this.status = status
        this.data = data
        this.code = code
    }

    static fromAxios(error: AxiosError<ServerErrorPayload>): ApiError {
        const status = error.response?.status ?? 500
        const payload = error.response?.data?.error

        let message: string
        let code: string | undefined

        if (typeof payload === 'string') {
            message = payload
        } else if (payload && typeof payload === 'object') {
            message = payload.message ?? error.message
            code = payload.code
        } else {
            message = error.message
        }

        return new ApiError(status, message, error.response?.data, code)
    }

    static isApiError(error: unknown): error is ApiError {
        return error instanceof ApiError
    }
}
