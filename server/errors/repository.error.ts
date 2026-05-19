export class RepositoryError extends Error {
    constructor(message: string, public readonly cause?: unknown) {
        super(message)
        this.name = 'RepositoryError'
    }
}

export class UserNotFoundError extends RepositoryError {
    constructor(identifier: string) {
        super(`User not found: ${identifier}`)
        this.name = 'UserNotFoundError'
    }
}

export class UserAlreadyExistsError extends RepositoryError {
    constructor(field: string, value: string) {
        super(`User with ${field} "${value}" already exists`)
        this.name = 'UserAlreadyExistsError'
    }
}
