import { ApiError } from './api-error'

export function withErrorHandling<TArgs extends unknown[], TResult>(
    fn: (...args: TArgs) => Promise<TResult>,
): (...args: TArgs) => Promise<TResult> {
    return async (...args) => {
        try {
            return await fn(...args)
        } catch (err) {
            if (ApiError.isApiError(err)) throw err
            if (err instanceof Error) throw new ApiError(500, err.message)
            throw new ApiError(500, 'An unexpected error occurred')
        }
    }
}
