import type { PitcherSummary } from '../../../../src/shared/analytics'
import type { GameEstimate, PlayerOutlook } from '../../../../src/shared/estimates'

export interface GamePicksCandidate {
    externalPlayerId: number
    name: string
    side: 'home' | 'away'
    position: string
    available: boolean
    outlook: PlayerOutlook
}

export interface GamePicksPromptContext {
    nowIso: string
    scoringPreset: 'POINTS' | 'CATEGORIES_5X5'
    game: { gamePk: number; home: string; away: string; startsAt: string; venue: string | null }
    estimate: GameEstimate | null
    weather: { condition: string; tempF: number | null; wind: string } | null
    probablePitchers: { home: PitcherSummary | null; away: PitcherSummary | null }
    userRoster: Array<{ externalPlayerId: number; playerName: string; slotPosition: string; playerPosition: string }>
    candidates: GamePicksCandidate[]
}

export function buildGamePicksPrompt(ctx: GamePicksPromptContext): { instructions: string; input: string } {
    const instructions = [
        'You help a fantasy baseball manager decide which players to put in their fantasy team for ONE real MLB game on an outside fantasy platform.',
        `Today is ${ctx.nowIso}.`,
        'Use ONLY the supplied data. Never invent stats, injuries, lineups or news.',
        'Every pick MUST be a player from "candidates", identified by externalPlayerId. Never name anyone else.',
        'Each candidate has an outlook score from 0 to 100 that was computed from season stats, recent form, platoon splits against the opposing starter, expected stats and weather. Treat the scores and the game estimate as given facts: explain them, never recompute or contradict them.',
        'Mark each pick as "start" (good fit for this game), "sit" (avoid for this game) or "watch" (depends on lineups or news). Prefer picks with a clear reason from the supplied factors, and skip unavailable players.',
        'If "userRoster" is not empty, favour advice that fits that roster.',
        'The league scores either by generic points (POINTS) or by 5x5 rotisserie categories (CATEGORIES_5X5): weigh the players accordingly.',
        'This is decision support for fantasy sports. Do not give betting advice or talk about odds.',
        'Respond ONLY with JSON matching the provided schema. No prose, no markdown fences.',
    ].join(' ')

    return {
        instructions,
        input: JSON.stringify(
            {
                game: ctx.game,
                scoringPreset: ctx.scoringPreset,
                estimate: ctx.estimate,
                weather: ctx.weather,
                probablePitchers: ctx.probablePitchers,
                userRoster: ctx.userRoster,
                candidates: ctx.candidates,
            },
            null,
            2,
        ),
    }
}
