// Prompt for the team-builder "Generate with AI" helper. The lineup is already
// chosen by the optimizer; the model only explains the key choices.

export interface TBAutofillPromptContext {
    nowIso: string
    period: string
    basis: 'schedule' | 'season-pace'
    rules: unknown
    pinned: Array<{ slotLabel: string; playerName: string; projectedPoints: number | null }>
    // Set for the categories formats: the categories that count.
    categories: string[] | null
    picks: Array<{
        slotLabel: string
        playerName: string
        position: string
        teamName: string
        projectedPoints: number
        score: number
        topCategories: string[]
    }>
    unfilled: Array<{ slotLabel: string; message: string }>
    // Best players who did not make the lineup, for "why not X" context.
    notPicked: Array<{ playerName: string; position: string; projectedPoints: number }>
}

export function buildTBAutofillPrompt(ctx: TBAutofillPromptContext): { instructions: string; input: string } {
    const instructions = [
        'You explain a fantasy baseball lineup that has already been chosen. You do not choose players.',
        `Today is ${ctx.nowIso}.`,
        ctx.categories
            ? `This league is scored by categories (${ctx.categories.join(', ')}), not by points. Each pick has a "score" (weighted category strength, higher is better) and "topCategories" (the categories where the player helps most). Write 2 to 4 plain sentences naming the key picks: who fills which slot, which categories they help, and how the hand-picked players fit.`
            : 'Write 2 to 4 plain sentences naming the key picks: who fills which slot, why they rank high for the scoring period and rules given, and how the hand-picked players fit.',
        'Use ONLY the names and numbers in the input. Never invent stats, injuries, matchups or other facts.',
        ctx.basis === 'season-pace'
            ? 'The projections are season-pace estimates because there are no scheduled games in the period. Say so in one short clause.'
            : 'The projections use the real schedule for the period.',
        'If some slots are listed under unfilled, mention in one sentence that they stayed open and why.',
        'Respond ONLY with a single JSON object with exactly one key: "explanation" (a string). No markdown, no extra keys.',
    ].join(' ')

    // In a categories format the points figure is not what the lineup was chosen on;
    // leave it out so the explanation talks about categories only.
    const shown = ctx.categories
        ? {
              ...ctx,
              pinned: ctx.pinned.map(({ projectedPoints: _points, ...rest }) => rest),
              picks: ctx.picks.map(({ projectedPoints: _points, ...rest }) => rest),
              notPicked: ctx.notPicked.map(({ projectedPoints: _points, ...rest }) => rest),
          }
        : ctx

    return { instructions, input: JSON.stringify(shown, null, 2) }
}
