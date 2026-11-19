import { z } from 'zod'

import { FANTASY_PLATFORMS } from '@/shared/team-builder'

import { baseballLeagueEnum } from '../baseball-league.schema'
import {
    categoriesSchema,
    fantasyFormatSchema,
    forecastPeriodSchema,
    lineupChangesSchema,
    salaryCapSchema,
    scoringRulesSchema,
    slotConfigSchema,
    slotIdSchema,
} from './team-settings.schema'

const poolPositionEnum = z.enum(['P', 'C', '1B', '2B', '3B', 'SS', 'OF'])

const rosterSlotPayloadSchema = z.object({
    externalPlayerId: z.number().int().positive(),
    slotKey: slotIdSchema,
    position: poolPositionEnum,
    name: z.string().min(1),
    teamName: z.string().min(1),
    salaryAtLock: z.number().int().positive().nullable(),
})

export const createTeamSchema = z.object({
    name: z.string().trim().min(1).max(60),
    // Only provider-backed leagues can hold a fantasy team.
    leagueSlug: baseballLeagueEnum,
    platform: z.enum(FANTASY_PLATFORMS).default('OTHER'),
    format: fantasyFormatSchema.default('H2H_POINTS'),
    forecastPeriod: forecastPeriodSchema.default('WEEK'),
    lineupChanges: lineupChangesSchema.default('DAILY'),
    scoringRules: scoringRulesSchema.optional(),
    slotConfig: slotConfigSchema.optional(),
    categories: categoriesSchema.optional(),
    salaryCap: salaryCapSchema.default(null),
    captainExternalPlayerId: z.number().int().positive().optional(),
    players: z.array(rosterSlotPayloadSchema).max(30),
})

export type CreateTeamBody = z.infer<typeof createTeamSchema>
export type CreateTeamRosterSlotBody = z.infer<typeof rosterSlotPayloadSchema>
