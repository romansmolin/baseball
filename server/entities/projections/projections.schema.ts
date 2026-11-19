import { z } from 'zod'

import { baseballLeagueEnum } from '../baseball-league.schema'
import { forecastPeriodSchema, scoringRulesSchema } from '../me/team-settings.schema'

export const projectionsRequestSchema = z
    .object({
    league: baseballLeagueEnum.optional(),
    teamIds: z.array(z.number().int().positive()).max(30).default([]),
    // Players already on a lineup: their teams are projected too.
    playerIds: z.array(z.number().int().positive()).max(40).default([]),
    period: forecastPeriodSchema,
    rules: scoringRulesSchema,
})
    .refine((value) => value.teamIds.length + value.playerIds.length > 0, {
        message: 'Give at least one team or player',
    })

export type ProjectionsRequest = z.infer<typeof projectionsRequestSchema>
