import { z } from 'zod'

import {
    CATEGORY_KEYS,
    FANTASY_FORMATS,
    FORECAST_PERIODS,
    LINEUP_CHANGES,
    SLOT_TYPES,
} from '@/shared/team-builder'

export const fantasyFormatSchema = z.enum(FANTASY_FORMATS)
export const forecastPeriodSchema = z.enum(FORECAST_PERIODS)
export const lineupChangesSchema = z.enum(LINEUP_CHANGES)

const points = z.number().min(-100).max(100)

export const scoringRulesSchema = z.object({
    hitting: z.object({
        single: points,
        double: points,
        triple: points,
        homeRun: points,
        run: points,
        rbi: points,
        walk: points,
        hitByPitch: points,
        stolenBase: points,
        strikeOut: points,
    }),
    pitching: z.object({
        inningPitched: points,
        strikeOut: points,
        earnedRun: points,
        hitAllowed: points,
        walkAllowed: points,
        win: points,
        save: points,
    }),
})

export const slotConfigSchema = z
    .array(
        z.object({
            slot: z.enum(SLOT_TYPES),
            count: z.number().int().min(0).max(10),
        }),
    )
    .refine((config) => config.length === new Set(config.map((entry) => entry.slot)).size, {
        message: 'Each slot type can appear only once',
    })
    .refine(
        (config) => {
            const total = config.reduce((sum, entry) => sum + entry.count, 0)
            return total >= 1 && total <= 30
        },
        { message: 'A lineup needs between 1 and 30 slots' },
    )

export const categoriesSchema = z
    .array(z.enum(CATEGORY_KEYS))
    .min(1)
    .refine((categories) => categories.length === new Set(categories).size, {
        message: 'Each category can appear only once',
    })

export const slotIdSchema = z.string().regex(/^(P|C|1B|2B|3B|SS|OF|UTIL|BENCH):\d+$/)

export const salaryCapSchema = z.number().int().positive().nullable()
