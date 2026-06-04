// AI-domain errors. These wrap the project's existing ApiError pattern so
// route handlers can map them to HTTP statuses uniformly via toResponse().
// `cause` carries the underlying details (upstream status, raw body) for
// logging without leaking through to the client response.

import { ApiError } from '../../errors/api.error'
import { ErrorCode } from '../../errors/error-code.enum'

export class AIProviderError extends ApiError {
    public readonly upstreamStatus: number | undefined
    public readonly upstreamBody: string | undefined

    constructor(
        message: string,
        opts: { upstreamStatus?: number; upstreamBody?: string } = {},
    ) {
        super(502, ErrorCode.AI_PROVIDER_ERROR, message)
        this.name = 'AIProviderError'
        this.upstreamStatus = opts.upstreamStatus
        this.upstreamBody = opts.upstreamBody
    }
}

export class InsufficientCreditsError extends ApiError {
    public readonly required: number
    public readonly available: number

    constructor(required: number, available: number) {
        super(
            402,
            ErrorCode.INSUFFICIENT_CREDITS,
            `This feature costs ${required} credits; balance is ${available}.`,
        )
        this.name = 'InsufficientCreditsError'
        this.required = required
        this.available = available
    }
}

export class FeatureDisabledError extends ApiError {
    public readonly featureKey: string

    constructor(featureKey: string) {
        super(403, ErrorCode.AI_FEATURE_DISABLED, `Feature ${featureKey} is disabled.`)
        this.name = 'FeatureDisabledError'
        this.featureKey = featureKey
    }
}

export class FeatureNotFoundError extends ApiError {
    public readonly featureKey: string

    constructor(featureKey: string) {
        super(404, ErrorCode.AI_FEATURE_NOT_FOUND, `Feature ${featureKey} not found.`)
        this.name = 'FeatureNotFoundError'
        this.featureKey = featureKey
    }
}
