import { ApiError } from '../../errors/api.error'
import type { IPerformersService } from '../../services/performers/performers.service.interface'

const DEFAULT_LIMIT = 5
const MAX_LIMIT = 20

export class PerformersController {
    private readonly performersService: IPerformersService

    constructor(performersService: IPerformersService) {
        this.performersService = performersService
    }

    async getWeekly(searchParams: URLSearchParams): Promise<Response> {
        try {
            const limit = clampLimit(searchParams.get('limit'))
            return Response.json(await this.performersService.getWeeklyTopPerformers(limit))
        } catch (error) {
            if (error instanceof ApiError) return error.toResponse()
            console.error('[PerformersController]', error)
            return ApiError.internal().toResponse()
        }
    }
}

function clampLimit(raw: string | null): number {
    const parsed = Number.parseInt(raw ?? '', 10)
    if (Number.isNaN(parsed) || parsed < 1) return DEFAULT_LIMIT
    return Math.min(MAX_LIMIT, parsed)
}
