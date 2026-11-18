export interface TradeAdvisorPromptContext {
    nowIso: string
    scoringPreset: 'POINTS' | 'CATEGORIES_5X5'
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
        'You are an assistant evaluating a hypothetical trade in a fantasy baseball league on an outside fantasy platform.',
        `Today is ${ctx.nowIso}.`,
        'Use ONLY the supplied data — never invent player stats, injury news, or transactions not in the input.',
        'Respond ONLY with JSON matching the provided schema. No prose, no markdown fences.',
        'Score fairness from the perspective of the user accepting the proposal: +1 means the trade is great for them, -1 means it hurts them, 0 means it is even.',
        'Provide a counterProposal only if the verdict is "counter" — otherwise omit that field entirely.',
        'The league scores either by generic points (POINTS) or by 5x5 rotisserie categories (CATEGORIES_5X5): weigh the players accordingly, e.g. in categories leagues steals and batting average matter more than in points leagues.',
    ].join(' ')

    const input = JSON.stringify(
        {
            league: { scoringPreset: ctx.scoringPreset },
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
