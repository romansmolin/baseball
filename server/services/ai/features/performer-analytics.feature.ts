// performer_analytics feature. Not a model call: the charts behind one top performer's week are
// computed from game logs. It goes through the AI billing flow so the charge happens only when the
// data comes back (a failed lookup costs nothing).

import { z } from 'zod'

import type { PerformerDetail } from '../../../../src/shared/performers'
import { GAME_LEAGUES } from '../../../../src/shared/games'
import { ApiError } from '../../../errors/api.error'
import { ErrorCode } from '../../../errors/error-code.enum'
import type { IPerformersService } from '../../performers/performers.service.interface'
import { AI_FEATURE_KEYS } from '../types'
import type { AIFeatureModule, AIInvocationResult } from '../types'

export const performerAnalyticsInputSchema = z.object({
    playerId: z.number().int().positive(),
    league: z.enum(GAME_LEAGUES).default('mlb'),
    group: z.enum(['hitting', 'pitching']),
})
export type PerformerAnalyticsInput = z.input<typeof performerAnalyticsInputSchema>

// The detail is built by trusted code and not validated against a schema, so a loose one stands in.
const performerDetailSchema = z.custom<PerformerDetail>((value) => typeof value === 'object' && value !== null)

export class PerformerAnalyticsFeature implements AIFeatureModule<PerformerAnalyticsInput, PerformerDetail> {
    readonly key = AI_FEATURE_KEYS.PERFORMER_ANALYTICS
    readonly inputSchema = performerAnalyticsInputSchema
    readonly outputSchema = performerDetailSchema

    private readonly performersService: IPerformersService

    constructor(performersService: IPerformersService) {
        this.performersService = performersService
    }

    async invoke(_userId: string, input: PerformerAnalyticsInput): Promise<AIInvocationResult<PerformerDetail>> {
        const { playerId, league, group } = this.inputSchema.parse(input)

        const detail = await this.performersService.getPerformerDetail(playerId, league, group)
        if (!detail) throw ApiError.notFound(ErrorCode.PLAYER_NOT_FOUND, `Player ${playerId} not found`)
        // Nothing to chart is not worth charging for.
        if (detail.games.length === 0) {
            throw ApiError.notFound(ErrorCode.PLAYER_NOT_FOUND, 'No games found for this player in this league')
        }

        return { output: detail, tokenUsage: { inputTokens: 0, outputTokens: 0 }, modelUsed: 'none' }
    }
}
