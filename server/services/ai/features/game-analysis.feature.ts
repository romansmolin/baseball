// game_analysis feature. A paid, one-game briefing: the potential result, the key factors and the
// players worth having in a fantasy team. The estimate, starters, weather and every player's
// outlook are computed here, deterministically; the model only explains them and chooses among
// the candidates it was given. The deterministic part is returned alongside as `matchup`.

import { z } from 'zod'

import { gameLeagueSchema } from '../../../entities/analytics/analytics.schema'
import type { ISportsProvider } from '../../../providers/sports-provider.interface'
import { ApiError } from '../../../errors/api.error'
import { ErrorCode } from '../../../errors/error-code.enum'
import type { IGamesService } from '../../games/games.service.interface'
import { AIProviderError } from '../errors'
import { buildGameAnalysisPrompt } from '../prompts/game-analysis.prompt'
import type { IOpenAIProvider } from '../provider/openai.provider'
import { AI_FEATURE_KEYS } from '../types'
import type { AIFeatureModule, AIInvocationResult } from '../types'

import { buildGameCandidates } from './game-candidates'
import type { ExpectedStatsLoader } from './game-candidates'

export const gameAnalysisInputSchema = z.object({
    gamePk: z.number().int().positive(),
    // MLB or a winter league; winter leagues have thinner player data, so the outlook is less certain.
    league: gameLeagueSchema,
})
export type GameAnalysisInput = z.input<typeof gameAnalysisInputSchema>

// What the model writes.
const modelOutputSchema = z.object({
    summary: z.string(),
    outlook: z.string(),
    keyFactors: z.array(z.object({ title: z.string(), detail: z.string() })).min(1),
    picks: z
        .array(
            z.object({
                externalPlayerId: z.number(),
                playerName: z.string(),
                role: z.enum(['start', 'sit', 'watch']),
                reason: z.string(),
            }),
        )
        .min(1),
})

const pitcherSchema = z
    .object({
        id: z.number(),
        fullName: z.string(),
        throws: z.enum(['L', 'R']).nullable(),
        era: z.number().nullable(),
        inningsPitched: z.number().nullable(),
    })
    .nullable()

// What the client gets: the model's text plus the computed facts it was based on.
export const gameAnalysisOutputSchema = modelOutputSchema.extend({
    gamePk: z.number(),
    matchup: z.object({
        lean: z.enum(['home', 'away', 'toss-up']),
        homeWinProbability: z.number().nullable(),
        confidence: z.enum(['low', 'medium', 'high']).nullable(),
        factors: z.array(z.object({ label: z.string(), effect: z.number() })),
        startsAt: z.string(),
        venue: z.string().nullable(),
        weather: z.object({ condition: z.string(), tempF: z.number().nullable(), wind: z.string() }).nullable(),
        starters: z.object({ home: pitcherSchema, away: pitcherSchema }),
    }),
})
export type GameAnalysisOutput = z.infer<typeof gameAnalysisOutputSchema>

// Within this band of 50% the game is called a toss-up.
const TOSS_UP_BAND = 0.05

export function leanFor(homeWinProbability: number | null): 'home' | 'away' | 'toss-up' {
    if (homeWinProbability === null || Math.abs(homeWinProbability - 0.5) <= TOSS_UP_BAND) return 'toss-up'
    return homeWinProbability > 0.5 ? 'home' : 'away'
}

export class GameAnalysisFeature implements AIFeatureModule<GameAnalysisInput, GameAnalysisOutput> {
    readonly key = AI_FEATURE_KEYS.GAME_ANALYSIS
    readonly inputSchema = gameAnalysisInputSchema
    readonly outputSchema = gameAnalysisOutputSchema

    private readonly provider: IOpenAIProvider
    private readonly sportsProvider: ISportsProvider
    private readonly gamesService: IGamesService
    private readonly loadExpected: ExpectedStatsLoader

    constructor(
        provider: IOpenAIProvider,
        sportsProvider: ISportsProvider,
        gamesService: IGamesService,
        loadExpected: ExpectedStatsLoader,
    ) {
        this.provider = provider
        this.sportsProvider = sportsProvider
        this.gamesService = gamesService
        this.loadExpected = loadExpected
    }

    async invoke(_userId: string, input: GameAnalysisInput): Promise<AIInvocationResult<GameAnalysisOutput>> {
        const { gamePk, league } = this.inputSchema.parse(input)

        const detail = await this.gamesService.getGameDetail(gamePk, league)
        if (!detail) throw ApiError.notFound(ErrorCode.GAME_NOT_FOUND, `Game ${gamePk} not found`)
        if (detail.game.status !== 'SCHEDULED') {
            throw ApiError.validationError('Analysis is only available for games that have not started')
        }

        const candidates = await buildGameCandidates(this.sportsProvider, this.loadExpected, detail)
        const { instructions, input: serialized } = buildGameAnalysisPrompt({
            nowIso: new Date().toISOString(),
            game: {
                gamePk,
                home: detail.game.homeTeam.name,
                away: detail.game.awayTeam.name,
                startsAt: detail.game.gameDateUtc,
                venue: detail.game.venueName,
            },
            estimate: detail.estimate,
            weather: detail.weather,
            probablePitchers: detail.probablePitchers,
            candidates,
        })

        const result = await this.provider.complete({
            tier: 'complex_reasoning',
            instructions,
            input: serialized,
            outputSchema: modelOutputSchema,
            schemaName: 'GameAnalysisModelOutput',
        })

        const allowed = new Set(candidates.map((c) => c.externalPlayerId))
        const stranger = result.output.picks.find((pick) => !allowed.has(pick.externalPlayerId))
        if (stranger) throw new AIProviderError(`Pick ${stranger.externalPlayerId} is not among the candidates`)

        const homeWinProbability = detail.estimate?.homeWinProbability ?? null
        return {
            ...result,
            output: {
                ...result.output,
                gamePk,
                matchup: {
                    lean: leanFor(homeWinProbability),
                    homeWinProbability,
                    confidence: detail.estimate?.confidence ?? null,
                    factors: (detail.estimate?.factors ?? []).map(({ label, effect }) => ({ label, effect })),
                    startsAt: detail.game.gameDateUtc,
                    venue: detail.game.venueName,
                    weather: detail.weather,
                    starters: detail.probablePitchers,
                },
            },
        }
    }
}
