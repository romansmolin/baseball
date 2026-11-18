import { ApiError } from '../../errors/api.error'
import { createTeamSchema } from '../../entities/me/create-team.schema'
import { updateLineupSchema } from '../../entities/me/update-lineup.schema'
import { updateTeamSchema } from '../../entities/me/update-team.schema'
import type {
    CreateTeamPayload,
    UpdateLineupPayload,
} from '@/shared/team-builder'
import type { IMeService } from '../../services/me/me.service.interface'
import type { IMeController } from './me.controller.interface'

export class MeController implements IMeController {
    private readonly meService: IMeService

    constructor(meService: IMeService) {
        this.meService = meService
    }

    async getMyTeams(userId: string): Promise<Response> {
        try {
            const payload = await this.meService.getMyTeams(userId)
            return Response.json(payload)
        } catch (error) {
            return this.handleError(error)
        }
    }

    async getBudget(userId: string): Promise<Response> {
        try {
            const budget = await this.meService.getBudget(userId)
            return Response.json(budget)
        } catch (error) {
            return this.handleError(error)
        }
    }

    async createMyTeam(body: unknown, userId: string): Promise<Response> {
        try {
            const result = createTeamSchema.safeParse(body)
            if (!result.success) {
                return ApiError.validationError(result.error.issues[0].message).toResponse()
            }

            const created = await this.meService.createMyTeam(
                userId,
                result.data as CreateTeamPayload,
            )
            return Response.json(created, { status: 201 })
        } catch (error) {
            return this.handleError(error)
        }
    }

    async renameMyTeam(body: unknown, userId: string, teamId: string): Promise<Response> {
        try {
            const result = updateTeamSchema.safeParse(body)
            if (!result.success) {
                return ApiError.validationError(result.error.issues[0].message).toResponse()
            }

            const updated = await this.meService.renameMyTeam(userId, teamId, result.data.name)
            return Response.json(updated)
        } catch (error) {
            return this.handleError(error)
        }
    }

    async updateMyTeamLineup(
        body: unknown,
        userId: string,
        teamId: string,
    ): Promise<Response> {
        try {
            const result = updateLineupSchema.safeParse(body)
            if (!result.success) {
                return ApiError.validationError(
                    result.error.issues[0].message,
                ).toResponse()
            }

            const updated = await this.meService.updateMyTeamLineup(
                userId,
                teamId,
                result.data as UpdateLineupPayload,
            )
            return Response.json(updated)
        } catch (error) {
            return this.handleError(error)
        }
    }

    private handleError(error: unknown): Response {
        if (error instanceof ApiError) {
            return error.toResponse()
        }

        console.error('[MeController]', error)
        return ApiError.internal().toResponse()
    }
}
