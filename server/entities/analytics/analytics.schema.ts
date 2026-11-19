import { z } from 'zod'

const season = z.coerce.number().int().min(1900).max(2100).optional()

export const playerAnalyticsQuerySchema = z.object({ season })

const MIN_COMPARE_PLAYERS = 2
const MAX_COMPARE_PLAYERS = 4

// `ids=1,2,3` — repeated ids count once, so comparing a player with himself is rejected.
export const compareQuerySchema = z.object({
    season,
    ids: z
        .string()
        .transform((value, ctx) => {
            const ids = value.split(',').map((part) => Number(part.trim()))
            if (ids.some((id) => !Number.isInteger(id) || id <= 0)) {
                ctx.addIssue({ code: 'custom', message: 'ids must be positive whole numbers' })
                return z.NEVER
            }
            return [...new Set(ids)]
        })
        .pipe(
            z
                .array(z.number())
                .min(MIN_COMPARE_PLAYERS, `Compare needs at least ${MIN_COMPARE_PLAYERS} different players`)
                .max(MAX_COMPARE_PLAYERS, `Compare takes at most ${MAX_COMPARE_PLAYERS} players`),
        ),
})

export const gamePkParamSchema = z.coerce.number().int().positive()

export type CompareQuery = z.infer<typeof compareQuerySchema>
