import { z } from 'zod'
import { POSITIONS } from '@/shared/sports'

import { baseballLeagueEnum } from '../baseball-league.schema'

const positionEnum = z.enum(POSITIONS as readonly [string, ...string[]])
const positionGroupEnum = z.enum(['P', 'IF', 'OF', 'C'])

export const listPlayersQuerySchema = z.object({
    league: baseballLeagueEnum.optional(),
    teamId: z.coerce.number().int().positive().optional(),
    position: positionEnum.optional(),
    positionGroup: positionGroupEnum.optional(),
    active: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
    search: z.string().min(1).max(64).optional(),
    season: z.coerce.number().int().min(1900).max(2100).optional(),
    limit: z.coerce.number().int().min(1).max(200).transform((value) => Math.min(value, 10)).optional(),
    offset: z.coerce.number().int().min(0).optional(),
})

export const playerIdParamSchema = z.coerce.number().int().positive()

export type ListPlayersQuery = z.infer<typeof listPlayersQuerySchema>
