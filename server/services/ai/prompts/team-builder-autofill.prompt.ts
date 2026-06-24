// Prompt for the team-builder Autofill helper. The AI's job is to pick the
// best players from a chosen set of MLB teams' rosters to fill any empty
// slots in the user's lineup, respecting the salary cap and any slots
// they've already filled. Output mirrors the 9-slot field shape.

export interface TBAutofillPromptPlayer {
    externalPlayerId: number
    fullName: string
    primaryPosition: string
    teamName: string
    salary: number
    projectedPoints: number
    available: boolean
}

export interface TBAutofillPromptContext {
    nowIso: string
    mlbTeamNames: string[]
    salaryCap: number
    salaryRemaining: number
    riskProfile: 'safe' | 'balanced' | 'high_ceiling'
    emptySlotKeys: string[]
    filledSlots: Array<{ slotKey: string; externalPlayerId: number; salary: number }>
    pool: TBAutofillPromptPlayer[]
}

export function buildTBAutofillPrompt(
    ctx: TBAutofillPromptContext,
): { instructions: string; input: string } {
    const instructions = [
        'You are an autofill helper for a fantasy baseball lineup builder.',
        `Today is ${ctx.nowIso}.`,
        `The candidate pool is drawn from these MLB teams: ${ctx.mlbTeamNames.join(', ')}. Each player in the pool has a "teamName" field showing which team they come from — you may mix players from any of these teams.`,
        'Use ONLY players from the supplied `pool` where `available: true`. Never invent players or repeat IDs.',
        'Fill EVERY slot listed in `emptySlotKeys` — return exactly one pick per empty slot key. Do not change `filledSlots`.',
        'Each slot accepts players by their `primaryPosition` value (note these are normalized codes, NOT raw baseball positions): slot "P" accepts primaryPosition "SP" or "RP" (any pitcher); slot "C" accepts "C"; slots "1B"/"2B"/"3B"/"SS" each accept the exact matching value; slots "LF"/"CF"/"RF" each accept primaryPosition "OF" (any outfielder). A player with primaryPosition "DH" fits no slot — do not place them.',
        'LF, CF and RF are THREE SEPARATE slots — assign a DIFFERENT outfielder to each. Never reuse a slotKey across two picks, and never assign the same player to two slots.',
        'Stay within salaryRemaining. Leaving a slot empty is a LAST RESORT — only omit a slot if no eligible, available player can fit. To fit everyone, prefer cheaper eligible players at each slot rather than dropping a slot.',
        'Respect riskProfile: "safe" prefers steady veterans, "high_ceiling" prefers high-projection upside, "balanced" sits in between.',
        'Respond ONLY with a single JSON object. No prose, no markdown fences, no comments.',
        'The JSON MUST have EXACTLY these top-level keys: "suggestedPicks", "strategy", "salaryUsed".',
        'Each element of "suggestedPicks" MUST have EXACTLY these keys: "slotKey", "externalPlayerId", "playerName". Do not rename, abbreviate, or add fields.',
        'The "slotKey" value MUST be one of these exact short codes (case-sensitive): "P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF". Never use long names like "Pitcher" or "First Base".',
        'Example of a valid response (use as a structural template, not as data):',
        JSON.stringify({
            suggestedPicks: [
                {
                    slotKey: '1B',
                    externalPlayerId: 660271,
                    playerName: 'Example Player',
                },
            ],
            strategy: 'One-sentence summary of the overall approach.',
            salaryUsed: 3000,
        }),
    ].join(' ')

    const input = JSON.stringify(
        {
            teams: ctx.mlbTeamNames,
            cap: { total: ctx.salaryCap, remaining: ctx.salaryRemaining },
            riskProfile: ctx.riskProfile,
            emptySlotKeys: ctx.emptySlotKeys,
            filledSlots: ctx.filledSlots,
            pool: ctx.pool,
        },
        null,
        2,
    )

    return { instructions, input }
}
