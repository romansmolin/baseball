// Prompt construction for the matchup_predictor feature. Kept in its own
// module so prompt iteration / A/B testing doesn't require editing feature
// code. Returns the (instructions, input) pair the OpenAI Responses API
// consumes — instructions ≈ system message, input ≈ user message.

export interface MatchupPredictorPromptContext {
    nowIso: string
    gamePk: number
    homeTeamName: string
    awayTeamName: string
    gameDateUtc: string
    gameStatus: string
    probableHomePitcher: string | null
    probableAwayPitcher: string | null
    homeRoster: Array<{ id: number; name: string; position: string }>
    awayRoster: Array<{ id: number; name: string; position: string }>
}

export function buildMatchupPredictorPrompt(
    ctx: MatchupPredictorPromptContext,
): { instructions: string; input: string } {
    const instructions = [
        'You are an assistant helping a fantasy baseball player evaluate a single MLB game.',
        `Today is ${ctx.nowIso}.`,
        'Use only the data provided in the input — do not invent statistics or refer to events outside it.',
        'Respond ONLY with JSON matching the provided schema. No prose, no markdown fences.',
        'Pick three to five key players to watch, drawn from the supplied rosters.',
        'Calibrate confidence honestly — favor "low" or "medium" when context is sparse.',
    ].join(' ')

    const input = JSON.stringify(
        {
            game: {
                externalGameId: String(ctx.gamePk),
                gameDateUtc: ctx.gameDateUtc,
                status: ctx.gameStatus,
                homeTeam: ctx.homeTeamName,
                awayTeam: ctx.awayTeamName,
                probableHomePitcher: ctx.probableHomePitcher,
                probableAwayPitcher: ctx.probableAwayPitcher,
            },
            rosters: {
                home: ctx.homeRoster,
                away: ctx.awayRoster,
            },
        },
        null,
        2,
    )

    return { instructions, input }
}
