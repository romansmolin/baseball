import { z } from 'zod'

// Mirrors the roster payload shape used by `createTeamSchema` — the team-
// builder send the same per-slot object for both create and edit flows.
// Kept structurally identical so a single client-side mapper feeds both.
const slotKeyEnum = z.enum(['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'])
const poolPositionEnum = z.enum(['P', 'C', '1B', '2B', '3B', 'SS', 'OF'])

const rosterSlotPayloadSchema = z.object({
    externalPlayerId: z.number().int().positive(),
    slotKey: slotKeyEnum,
    position: poolPositionEnum,
    name: z.string().min(1),
    teamName: z.string().min(1),
    salaryAtLock: z.number().int().positive(),
})

// Lineup-update payload — name and leagueSlug never change here. Captain is
// optional (omit to clear).
export const updateLineupSchema = z.object({
    captainExternalPlayerId: z.number().int().positive().optional(),
    players: z.array(rosterSlotPayloadSchema).min(1).max(9),
})

export type UpdateLineupBody = z.infer<typeof updateLineupSchema>
export type UpdateLineupRosterSlotBody = z.infer<typeof rosterSlotPayloadSchema>
