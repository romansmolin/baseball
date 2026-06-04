export interface LineupOptimizerPromptPlayer {
    externalPlayerId: number
    fullName: string
    primaryPosition: string
    teamName: string | null
    salary: number
    projectedPoints: number
    preferred: boolean
}

export interface LineupOptimizerPromptContext {
    nowIso: string
    tournamentName: string
    salaryCap: number
    rosterSlots: string[]
    scoringRuleSummary: Record<string, number>
    riskProfile: 'safe' | 'balanced' | 'high_ceiling'
    pool: LineupOptimizerPromptPlayer[]
}

export function buildLineupOptimizerPrompt(
    ctx: LineupOptimizerPromptContext,
): { instructions: string; input: string } {
    const instructions = [
        'You are an assistant building an optimal fantasy baseball lineup for a season-long tournament.',
        `Today is ${ctx.nowIso}.`,
        'Use ONLY the players supplied in `pool` — never invent names, salaries, or projections.',
        `Pick exactly one player per slot in this order: ${ctx.rosterSlots.join(', ')}.`,
        `Total salary must not exceed ${ctx.salaryCap}.`,
        'Respect the riskProfile: "safe" prefers stable veterans and lower variance, "high_ceiling" prefers high-projection upside even if volatile, "balanced" sits in between.',
        'Lean toward players marked `preferred: true` when comparable on value.',
        'For each pick, write a 1-2 sentence `reasoning` that references the scoring rule or projection.',
        'Respond ONLY with JSON matching the provided schema. No prose, no markdown fences.',
    ].join(' ')

    const input = JSON.stringify(
        {
            tournament: { name: ctx.tournamentName, salaryCap: ctx.salaryCap },
            scoringRule: ctx.scoringRuleSummary,
            riskProfile: ctx.riskProfile,
            rosterSlots: ctx.rosterSlots,
            pool: ctx.pool,
        },
        null,
        2,
    )

    return { instructions, input }
}
