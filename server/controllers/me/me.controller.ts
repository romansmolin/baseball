import { ApiError } from '../../errors/api.error'
import { activityQuerySchema } from '../../entities/me/activity.schema'
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

    async getOnboarding(userId: string): Promise<Response> {
        try {
            const steps = await this.meService.getOnboarding(userId)
            return Response.json(steps)
        } catch (error) {
            return this.handleError(error)
        }
    }

    async getCredits(userId: string): Promise<Response> {
        try {
            const summary = await this.meService.getCredits(userId)
            return Response.json(summary)
        } catch (error) {
            return this.handleError(error)
        }
    }

    async getMetrics(userId: string): Promise<Response> {
        try {
            const metrics = await this.meService.getMetrics(userId)
            return Response.json(metrics)
        } catch (error) {
            return this.handleError(error)
        }
    }

    async getActivity(userId: string, searchParams: URLSearchParams): Promise<Response> {
        try {
            const result = activityQuerySchema.safeParse(Object.fromEntries(searchParams))
            if (!result.success) {
                return ApiError.validationError(result.error.issues[0].message).toResponse()
            }

            const events = await this.meService.getActivity(userId, result.data.limit)
            return Response.json(events)
        } catch (error) {
            return this.handleError(error)
        }
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

    async getMyTournaments(userId: string): Promise<Response> {
        try {
            const tournaments = await this.meService.getMyTournaments(userId)
            return Response.json(tournaments)
        } catch (error) {
            return this.handleError(error)
        }
    }

    async getMyTournamentProgress(
        userId: string,
        tournamentId: string,
    ): Promise<Response> {
        try {
            const progress = await this.meService.getMyTournamentProgress(
                userId,
                tournamentId,
            )
            return Response.json(progress)
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
