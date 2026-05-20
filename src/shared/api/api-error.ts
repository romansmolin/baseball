import { AxiosError } from 'axios'

export class ApiError extends Error {
    readonly status: number
    readonly data: unknown

    constructor(status: number, message: string, data?: unknown) {
        super(message)
        this.name = 'ApiError'
        this.status = status
        this.data = data
    }

    static fromAxios(error: AxiosError<{ error?: string }>): ApiError {
        const status = error.response?.status ?? 500
        const message = error.response?.data?.error ?? error.message

        return new ApiError(status, message, error.response?.data)
    }

    static isApiError(error: unknown): error is ApiError {
        return error instanceof ApiError
    }
}
