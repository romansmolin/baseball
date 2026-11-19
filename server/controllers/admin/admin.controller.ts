import { userLookupSchema } from '../../entities/admin/admin.schema'
import { ApiError } from '../../errors/api.error'
import type { IAdminService } from '../../services/admin/admin.service.interface'

import type { IAdminController } from './admin.controller.interface'

export class AdminController implements IAdminController {
    private readonly adminService: IAdminService

    constructor(adminService: IAdminService) {
        this.adminService = adminService
    }

    async getUserActivity(adminId: string, body: unknown): Promise<Response> {
        const parsed = userLookupSchema.safeParse(body)
        if (!parsed.success) return ApiError.validationError(parsed.error.issues[0].message).toResponse()

        try {
            return Response.json(await this.adminService.getUserActivity(adminId, parsed.data.email))
        } catch (error) {
            return this.handleError(error)
        }
    }

    async createUserReport(adminId: string, body: unknown): Promise<Response> {
        const parsed = userLookupSchema.safeParse(body)
        if (!parsed.success) return ApiError.validationError(parsed.error.issues[0].message).toResponse()

        try {
            return Response.json(await this.adminService.createUserReport(adminId, parsed.data.email))
        } catch (error) {
            return this.handleError(error)
        }
    }

    private handleError(error: unknown): Response {
        if (error instanceof ApiError) return error.toResponse()
        console.error('[AdminController]', error)
        return ApiError.internal().toResponse()
    }
}
