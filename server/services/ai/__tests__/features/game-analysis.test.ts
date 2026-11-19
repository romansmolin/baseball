import { describe, expect, it, vi } from 'vitest'

import type { GameDetail } from '../../../../../src/shared/analytics'
import type { ProviderPlayer } from '../../../../providers/dto/provider-player.dto'
import type { ISportsProvider } from '../../../../providers/sports-provider.interface'
import type { IGamesService } from '../../../games/games.service.interface'
import { GameAnalysisFeature, leanFor } from '../../features/game-analysis.feature'
import type { IOpenAIProvider } from '../../provider/openai.provider'

const detail = (overrides: Partial<GameDetail['game']> = {}): GameDetail => ({
    game: {
        gamePk: 99,
        leagueSlug: 'mlb',
        gameDateUtc: '2026-04-01T23:00:00Z',
        status: 'SCHEDULED',
        homeTeam: { id: 1, name: 'Home Club', teamName: 'Home', abbreviation: 'HOM' },
        awayTeam: { id: 2, name: 'Away Club', teamName: 'Away', abbreviation: 'AWY' },
        venueName: 'Park',
        homeScore: null,
        awayScore: null,
        homeProbablePitcher: null,
        awayProbablePitcher: null,
        estimate: null,
        ...overrides,
    },
    weather: null,
    probablePitchers: { home: null, away: null },
    lineupsPosted: true,
    estimate: {
        gamePk: 99,
        homeWinProbability: 0.62,
        confidence: 'medium',
        factors: [{ key: 'home_field', label: 'Home field', effect: 0.03 }],
    },
})

const hitter = (id: number): ProviderPlayer =>
    ({
        id,
        fullName: `Hitter ${id}`,
        primaryPosition: 'OF',
        teamId: 1,
        battingStats: { plateAppearances: 500 },
    }) as unknown as ProviderPlayer

const sports = {
    getPlayersByTeam: vi.fn(async (teamId: number) => (teamId === 1 ? [hitter(100)] : [])),
    getPlayerProfile: vi.fn(async (id: number) => ({
        player: hitter(id),
        hitting: { season: { ops: '.800', plateAppearances: 400 }, sabermetrics: null, splits: [], gameLog: [] },
        pitching: null,
        status: { code: 'A', description: 'Active', available: true },
    })),
} as unknown as ISportsProvider

const games = (value: GameDetail): IGamesService => ({
    getUpcomingGames: vi.fn(),
    getGameDetail: vi.fn().mockResolvedValue(value),
})

const modelAnswer = (pickId: number) => ({
    summary: 's',
    outlook: 'o',
    keyFactors: [{ title: 't', detail: 'd' }],
    picks: [{ externalPlayerId: pickId, playerName: 'x', role: 'start', reason: 'r' }],
})

const openai = (output: unknown): IOpenAIProvider => ({
    complete: vi.fn().mockResolvedValue({ output, tokenUsage: { inputTokens: 1, outputTokens: 1 }, modelUsed: 'm' }),
})

const build = (ai: IOpenAIProvider, value = detail()) =>
    new GameAnalysisFeature(ai, sports, games(value), vi.fn().mockResolvedValue([]))

describe('GameAnalysisFeature', () => {
    it('adds the computed matchup to the model text', async () => {
        const { output } = await build(openai(modelAnswer(100))).invoke('u1', { gamePk: 99 })

        expect(output.matchup).toMatchObject({
            lean: 'home',
            homeWinProbability: 0.62,
            confidence: 'medium',
            venue: 'Park',
        })
        expect(output.matchup.factors).toEqual([{ label: 'Home field', effect: 0.03 }])
    })

    it('rejects a pick who was not a candidate', async () => {
        await expect(build(openai(modelAnswer(424242))).invoke('u1', { gamePk: 99 })).rejects.toThrow(
            /not among the candidates/,
        )
    })

    it('analyses a winter-league game too, looking the game up in that league', async () => {
        const gamesService = games(detail({ leagueSlug: 'winter-leagues' }))
        const feature = new GameAnalysisFeature(
            openai(modelAnswer(100)),
            sports,
            gamesService,
            vi.fn().mockResolvedValue([]),
        )

        await feature.invoke('u1', { gamePk: 99, league: 'winter-leagues' })

        expect(gamesService.getGameDetail).toHaveBeenCalledWith(99, 'winter-leagues')
    })

    it('does not call the model once the game has started', async () => {
        const ai = openai(modelAnswer(100))

        await expect(build(ai, detail({ status: 'LIVE' })).invoke('u1', { gamePk: 99 })).rejects.toThrow(/not started/)
        expect(ai.complete).not.toHaveBeenCalled()
    })
})

describe('leanFor', () => {
    it('calls a game within 5 points of even a toss-up', () => {
        expect([0.62, 0.4, 0.53, null].map(leanFor)).toEqual(['home', 'away', 'toss-up', 'toss-up'])
    })
})
