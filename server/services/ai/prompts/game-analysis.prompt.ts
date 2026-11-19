import type { PitcherSummary } from '../../../../src/shared/analytics'
import type { GameEstimate } from '../../../../src/shared/estimates'
import type { GameCandidate } from '../features/game-candidates'

export interface GameAnalysisPromptContext {
    nowIso: string
    game: { gamePk: number; home: string; away: string; startsAt: string; venue: string | null }
    estimate: GameEstimate | null
    weather: { condition: string; tempF: number | null; wind: string } | null
    probablePitchers: { home: PitcherSummary | null; away: PitcherSummary | null }
    candidates: GameCandidate[]
}

export function buildGameAnalysisPrompt(ctx: GameAnalysisPromptContext): { instructions: string; input: string } {
    const instructions = [
        'You write a pre-game analysis of ONE real baseball game (MLB or a winter league) for a fantasy baseball manager.',
        `Today is ${ctx.nowIso}.`,
        'Use ONLY the supplied data. Never invent stats, injuries, lineups or news.',
        'The game "estimate" (home win probability and its factors) and every candidate\'s outlook score (0-100) were computed from season stats, recent form, platoon splits, expected stats and weather. Treat them as given facts: explain them, never recompute or contradict them.',
        '"summary": two or three plain sentences on what kind of game to expect.',
        '"outlook": the likely shape of the game and the potential result in plain words (who is favoured and why, how close it should be), consistent with the estimate. Do not state a final score.',
        '"keyFactors": three to five objects with exactly the fields "title" (a few words) and "detail" (one sentence), taken from the estimate factors, starters and weather.',
        '"picks": the players worth having in a fantasy team for this game. Each pick is an object with exactly the fields "externalPlayerId" (a number taken from "candidates"), "playerName" (that candidate\'s name), "role" and "reason". "role" is "start" (good fit), "sit" (avoid) or "watch" (depends on lineups or news); "reason" is one sentence from the supplied factors. Every pick MUST be a player from "candidates". Skip unavailable players and players whose outlook score is null.',
        'This is decision support for fantasy sports. Do not give betting advice or talk about odds.',
        'Respond ONLY with JSON matching the provided schema. No prose, no markdown fences.',
    ].join(' ')

    return {
        instructions,
        input: JSON.stringify(
            {
                game: ctx.game,
                estimate: ctx.estimate,
                weather: ctx.weather,
                probablePitchers: ctx.probablePitchers,
                candidates: ctx.candidates,
            },
            null,
            2,
        ),
    }
}
