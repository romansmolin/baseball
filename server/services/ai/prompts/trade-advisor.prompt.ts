export interface TradeAdvisorPromptContext {
    nowIso: string
    leagueName: string
    scoringRuleSummary: Record<string, number>
    userRoster: Array<{
        externalPlayerId: number
        playerName: string
        slotPosition: string
        playerPosition: string
    }>
    giving: Array<{
        externalPlayerId: number
        fullName: string
        primaryPosition: string
        teamName: string | null
    }>
    receiving: Array<{
        externalPlayerId: number
        fullName: string
        primaryPosition: string
        teamName: string | null
    }>
}

export function buildTradeAdvisorPrompt(
    ctx: TradeAdvisorPromptContext,
): { instructions: string; input: string } {
    const instructions = [
        'You are an assistant evaluating a hypothetical trade in a season-long fantasy baseball league.',
        `Today is ${ctx.nowIso}.`,
        'Use ONLY the supplied data — never invent player stats, injury news, or transactions not in the input.',
        'Respond ONLY with JSON matching the provided schema. No prose, no markdown fences.',
        'Score fairness from the perspective of the user accepting the proposal: +1 means the trade is great for them, -1 means it hurts them, 0 means it is even.',
        'Provide a counterProposal only if the verdict is "counter" — otherwise omit that field entirely.',
        'Use the scoring rule to weigh which categories matter; for example, if rbi is worth 2 and walk is 2, a high-OBP slugger is more valuable than a contact-only hitter.',
    ].join(' ')

    const input = JSON.stringify(
        {
            league: { name: ctx.leagueName, scoringRule: ctx.scoringRuleSummary },
            userRoster: ctx.userRoster,
            proposal: {
                giving: ctx.giving,
                receiving: ctx.receiving,
            },
        },
        null,
        2,
    )

    return { instructions, input }
}
