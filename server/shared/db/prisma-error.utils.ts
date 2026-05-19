import { RepositoryError } from '../errors/repository.error'

export function isPrismaError(error: unknown, code: string): error is { code: string; meta?: Record<string, unknown> } {
    return (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: unknown }).code === code
    )
}

export function extractUniqueField(error: { meta?: Record<string, unknown> }): string {
    const target = error.meta?.target
    if (Array.isArray(target) && typeof target[0] === 'string') return target[0]
    return 'unknown field'
}

export function handleRepositoryError(error: unknown): RepositoryError {
    if (error instanceof RepositoryError) return error
    if (error instanceof Error) return new RepositoryError(error.message, error)
    return new RepositoryError('Unexpected repository error', error)
}
