import { projectionsRequestSchema } from '../../entities/projections/projections.schema'
import { ErrorCode } from '../../errors/error-code.enum'
import { ApiError } from '../../errors/api.error'
import type { IProjectionsService } from '../../services/projections/projections.service.interface'
import { errorResponse } from '../provider-error.response'

import type { IProjectionsController } from './projections.controller.interface'

export class ProjectionsController implements IProjectionsController {
    private readonly projectionsService: IProjectionsService

    constructor(projectionsService: IProjectionsService) {
        this.projectionsService = projectionsService
    }

    async projectTeams(body: unknown): Promise<Response> {
        const parsed = projectionsRequestSchema.safeParse(body)
        if (!parsed.success) {
            return ApiError.validationError(parsed.error.issues[0].message).toResponse()
        }

        try {
            const { basis, projections, scales } = await this.projectionsService.projectTeams(parsed.data)
            return Response.json({ basis, projections, scales })
        } catch (error) {
            return errorResponse(error, ErrorCode.PLAYER_NOT_FOUND, 'ProjectionsController')
        }
    }
}
