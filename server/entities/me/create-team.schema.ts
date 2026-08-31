import { z } from 'zod'

import { baseballLeagueEnum } from '../baseball-league.schema'

const slotKeyEnum = z.enum(['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'])
const poolPositionEnum = z.enum(['P', 'C', '1B', '2B', '3B', 'SS', 'OF'])
const formatEnum = z.enum(['Daily', 'Weekly', 'Tournament'])

const rosterSlotPayloadSchema = z.object({
    externalPlayerId: z.number().int().positive(),
    slotKey: slotKeyEnum,
    position: poolPositionEnum,
    name: z.string().min(1),
    teamName: z.string().min(1),
    salaryAtLock: z.number().int().positive(),
})

export const createTeamSchema = z.object({
    name: z.string().trim().min(1).max(60),
    // Only provider-backed leagues can hold a fantasy team.
    leagueSlug: baseballLeagueEnum,
    format: formatEnum.optional(),
    captainExternalPlayerId: z.number().int().positive().optional(),
    players: z.array(rosterSlotPayloadSchema).min(1).max(9),
})

export type CreateTeamBody = z.infer<typeof createTeamSchema>
export type CreateTeamRosterSlotBody = z.infer<typeof rosterSlotPayloadSchema>
