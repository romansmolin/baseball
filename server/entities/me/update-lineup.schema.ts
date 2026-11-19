import { z } from 'zod'

import { FANTASY_PLATFORMS } from '@/shared/team-builder'

import {
    fantasyFormatSchema,
    forecastPeriodSchema,
    lineupChangesSchema,
    salaryCapSchema,
    scoringRulesSchema,
    slotConfigSchema,
    slotIdSchema,
} from './team-settings.schema'

// Mirrors the roster payload shape used by `createTeamSchema` — the team-
// builder send the same per-slot object for both create and edit flows.
// Kept structurally identical so a single client-side mapper feeds both.
const poolPositionEnum = z.enum(['P', 'C', '1B', '2B', '3B', 'SS', 'OF'])

const rosterSlotPayloadSchema = z.object({
    externalPlayerId: z.number().int().positive(),
    slotKey: slotIdSchema,
    position: poolPositionEnum,
    name: z.string().min(1),
    teamName: z.string().min(1),
    salaryAtLock: z.number().int().positive().nullable(),
})

// Lineup-update payload — name and leagueSlug never change here. Captain is
// optional (omit to clear). Platform and preset stay as saved unless sent.
export const updateLineupSchema = z.object({
    platform: z.enum(FANTASY_PLATFORMS).optional(),
    format: fantasyFormatSchema.optional(),
    forecastPeriod: forecastPeriodSchema.optional(),
    lineupChanges: lineupChangesSchema.optional(),
    scoringRules: scoringRulesSchema.optional(),
    slotConfig: slotConfigSchema.optional(),
    salaryCap: salaryCapSchema.optional(),
    captainExternalPlayerId: z.number().int().positive().optional(),
    players: z.array(rosterSlotPayloadSchema).max(30),
})

export type UpdateLineupBody = z.infer<typeof updateLineupSchema>
export type UpdateLineupRosterSlotBody = z.infer<typeof rosterSlotPayloadSchema>
