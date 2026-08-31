import { z } from 'zod'
import { POSITIONS } from '@/shared/sports'

import { baseballLeagueEnum } from '../baseball-league.schema'

const positionEnum = z.enum(POSITIONS as readonly [string, ...string[]])

export const listPlayersQuerySchema = z.object({
    league: baseballLeagueEnum.optional(),
    teamId: z.coerce.number().int().positive().optional(),
    position: positionEnum.optional(),
    search: z.string().min(1).max(64).optional(),
    season: z.coerce.number().int().min(1900).max(2100).optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
    offset: z.coerce.number().int().min(0).optional(),
})

export const playerIdParamSchema = z.coerce.number().int().positive()

export type ListPlayersQuery = z.infer<typeof listPlayersQuerySchema>
