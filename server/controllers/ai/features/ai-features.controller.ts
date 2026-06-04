import { ApiError } from '../../../errors/api.error'
import type { IAIFeaturesService } from '../../../services/ai/features/ai-features.service.interface'
import type { IAIFeaturesController } from './ai-features.controller.interface'

export class AIFeaturesController implements IAIFeaturesController {
    private readonly aiFeaturesService: IAIFeaturesService

    constructor(aiFeaturesService: IAIFeaturesService) {
        this.aiFeaturesService = aiFeaturesService
    }

    async list(): Promise<Response> {
        try {
            const items = this.aiFeaturesService.listFeatures()
            return Response.json(items)
        } catch (error) {
            return this.handleError(error)
        }
    }

    private handleError(error: unknown): Response {
        if (error instanceof ApiError) {
            return error.toResponse()
        }

        console.error('[AIFeaturesController]', error)
        return ApiError.internal().toResponse()
    }
}
