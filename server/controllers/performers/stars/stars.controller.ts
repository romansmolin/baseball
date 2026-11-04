import { ApiError } from '../../../errors/api.error'
import { topPerformersQuerySchema } from '../../../entities/performers/top.schema'
import type { IStarsService } from '../../../services/performers/stars/stars.service.interface'
import type { IStarsController } from './stars.controller.interface'

const DEFAULT_LIMIT = 8

export class StarsController implements IStarsController {
    private readonly starsService: IStarsService

    constructor(starsService: IStarsService) {
        this.starsService = starsService
    }

    async get(searchParams: URLSearchParams): Promise<Response> {
        try {
            const result = topPerformersQuerySchema.safeParse(Object.fromEntries(searchParams))
            if (!result.success) {
                return ApiError.validationError(result.error.issues[0].message).toResponse()
            }
            return Response.json(await this.starsService.getStars(result.data.limit ?? DEFAULT_LIMIT))
        } catch (error) {
            if (error instanceof ApiError) return error.toResponse()
            console.error('[StarsController]', error)
            return ApiError.internal().toResponse()
        }
    }
}
