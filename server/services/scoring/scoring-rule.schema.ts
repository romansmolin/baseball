import { z } from 'zod'

// Frozen shape for a baseball ScoringRule.rules JSON column. The seed creates
// one default row ("standard" v1) with all of these keys present. Bad data in
// the DB throws — there is no silent fallback to a default rule.

export const BaseballScoringRuleSchema = z.object({
    // Batting
    single: z.number(),
    double: z.number(),
    triple: z.number(),
    homeRun: z.number(),
    rbi: z.number(),
    runScored: z.number(),
    stolenBase: z.number(),
    walk: z.number(),
    strikeoutBatter: z.number(),
    // Pitching
    inningPitched: z.number(),
    strikeoutPitcher: z.number(),
    win: z.number(),
    earnedRunAllowed: z.number(),
})

export type BaseballScoringRule = z.infer<typeof BaseballScoringRuleSchema>

export function parseScoringRule(raw: unknown): BaseballScoringRule {
    const result = BaseballScoringRuleSchema.safeParse(raw)
    if (!result.success) {
        throw new Error(
            `Invalid ScoringRule.rules JSON: ${result.error.issues
                .map((i) => i.message)
                .join(', ')}`,
        )
    }
    return result.data
}
