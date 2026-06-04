export interface PlayerAnalysisPromptContext {
    nowIso: string
    contextDateIso: string
    player: {
        externalId: number
        fullName: string
        primaryPosition: string
        teamName: string | null
        teamAbbreviation: string | null
    }
    recentGames: Array<{
        gamePk: number
        dateUtc: string
        opponentTeamId: number | null
        wasHome: boolean
        // For batters
        hits?: number
        homeRuns?: number
        rbi?: number
        runs?: number
        stolenBases?: number
        baseOnBalls?: number
        strikeOuts?: number
        // For pitchers
        inningsPitched?: number
        strikeOutsThrown?: number
        earnedRuns?: number
        win?: boolean
    }>
    nextGame: {
        gamePk: number
        dateUtc: string
        opponentName: string
        wasHome: boolean
    } | null
}

export function buildPlayerAnalysisPrompt(
    ctx: PlayerAnalysisPromptContext,
): { instructions: string; input: string } {
    const instructions = [
        'You are an assistant helping a fantasy baseball player decide whether to start, hold, or avoid a single MLB player.',
        `Today is ${ctx.nowIso}. The user asked about ${ctx.contextDateIso}.`,
        'Use ONLY the supplied data — never invent statistics, injury news, or events not in the input.',
        'Respond ONLY with JSON matching the provided schema. No prose, no markdown fences.',
        'Calibrate "currentForm" against the supplied recent-game lines, not your priors.',
        'If `nextGame` is null, set `nextGameMatchup` to null in the output.',
        'Pick three to six `keyStats` that justify your recommendation.',
    ].join(' ')

    const input = JSON.stringify(
        {
            player: ctx.player,
            recentGames: ctx.recentGames,
            nextGame: ctx.nextGame,
        },
        null,
        2,
    )

    return { instructions, input }
}
