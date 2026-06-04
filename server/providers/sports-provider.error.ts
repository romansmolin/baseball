export class ProviderError extends Error {
    public readonly statusCode: number

    constructor(message: string, statusCode = 502) {
        super(message)
        this.name = 'ProviderError'
        this.statusCode = statusCode
    }
}

export class ProviderNotFoundError extends ProviderError {
    constructor(message: string) {
        super(message, 404)
        this.name = 'ProviderNotFoundError'
    }
}

export class ProviderUnavailableError extends ProviderError {
    constructor(message: string) {
        super(message, 503)
        this.name = 'ProviderUnavailableError'
    }
}

export class ProviderNotConfiguredError extends ProviderError {
    constructor(message: string) {
        super(message, 500)
        this.name = 'ProviderNotConfiguredError'
    }
}
