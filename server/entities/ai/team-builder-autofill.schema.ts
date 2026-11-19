import { z } from 'zod'

import { baseballLeagueEnum } from '../baseball-league.schema'
import {
    categoriesSchema,
    fantasyFormatSchema,
    forecastPeriodSchema,
    salaryCapSchema,
    scoringRulesSchema,
    slotConfigSchema,
    slotIdSchema,
} from '../me/team-settings.schema'

export const tbAutofillInputSchema = z.object({
    // Which baseball league the team ids belong to. Defaults to MLB.
    league: baseballLeagueEnum.optional(),
    // Candidate pool: union of these teams' rosters. At least one required.
    mlbTeamIds: z.array(z.number().int().positive()).min(1).max(30),
    format: fantasyFormatSchema.refine((format) => format !== 'DFS', {
        message: 'DFS is not supported yet',
    }),
    period: forecastPeriodSchema,
    rules: scoringRulesSchema,
    // Categories formats: which categories count (all ten when omitted).
    categories: categoriesSchema.optional(),
    slotConfig: slotConfigSchema,
    salaryCap: salaryCapSchema.optional(),
    // Slots the user already filled by hand. They stay exactly as they are.
    filledSlots: z
        .array(
            z.object({
                slotId: slotIdSchema,
                externalPlayerId: z.number().int().positive(),
            }),
        )
        .optional(),
})
export type TBAutofillInput = z.infer<typeof tbAutofillInputSchema>

export const tbAutofillOutputSchema = z.object({
    suggestedPicks: z.array(
        z.object({
            slotId: slotIdSchema,
            externalPlayerId: z.number().int().positive(),
            playerName: z.string(),
            projectedPoints: z.number(),
            // What the pick was chosen on: points in H2H Points, weighted category strength otherwise.
            score: z.number(),
            // Enough to render the player without loading rosters again.
            position: z.enum(['P', 'C', '1B', '2B', '3B', 'SS', 'OF']),
            teamName: z.string(),
            photoUrl: z.string().nullable(),
        }),
    ),
    // Slots we could not fill, each with the concrete reason.
    unfilled: z.array(
        z.object({
            slotId: slotIdSchema,
            code: z.enum(['NO_ELIGIBLE_PLAYER', 'NO_PROJECTION', 'CAP_TOO_LOW', 'POOL_EMPTY']),
            message: z.string(),
        }),
    ),
    explanation: z.string(),
    totalPoints: z.number(),
    basis: z.enum(['schedule', 'season-pace']),
})
export type TBAutofillOutput = z.infer<typeof tbAutofillOutputSchema>

// What the model returns: only the explanation. It never chooses players.
export const tbAutofillExplanationSchema = z.object({ explanation: z.string() })
