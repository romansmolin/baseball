import { z } from 'zod'

import { baseballLeagueEnum } from '../baseball-league.schema'

export const listTeamsQuerySchema = z.object({
    league: baseballLeagueEnum.optional(),
    season: z.coerce.number().int().min(1900).max(2100).optional(),
    activeOnly: z
        .union([z.literal('true'), z.literal('false'), z.boolean()])
        .transform((v) => v === true || v === 'true')
        .optional(),
})

export const teamIdParamSchema = z.coerce.number().int().positive()

export const teamRosterQuerySchema = z.object({
    league: baseballLeagueEnum.optional(),
    season: z.coerce.number().int().min(1900).max(2100).optional(),
    rosterType: z.enum(['active', '40Man', 'fullSeason']).optional(),
})

export type ListTeamsQuery = z.infer<typeof listTeamsQuerySchema>
export type TeamRosterQuery = z.infer<typeof teamRosterQuerySchema>
