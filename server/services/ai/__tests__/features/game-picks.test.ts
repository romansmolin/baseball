import { describe, expect, it, vi } from 'vitest'

import type { GameDetail } from '../../../../../src/shared/analytics'
import type { ProviderPlayerProfile } from '../../../../providers/dto/provider-player-profile.dto'
import type { ProviderPlayer } from '../../../../providers/dto/provider-player.dto'
import type { ISportsProvider } from '../../../../providers/sports-provider.interface'
import type { IFantasyTeamRepository } from '../../../../repositories/fantasy-team/fantasy-team.repository.interface'
import type { IGamesService } from '../../../games/games.service.interface'
import type { IOpenAIProvider } from '../../provider/openai.provider'
import {
    GamePicksFeature,
    gamePicksInputSchema,
    gamePicksOutputSchema,
} from '../../features/game-picks.feature'

const HOME = 1
const AWAY = 2

const detail = (overrides: Partial<GameDetail['game']> = {}): GameDetail => ({
    game: {
        gamePk: 99,
        leagueSlug: 'mlb',
        gameDateUtc: '2026-04-01T23:00:00Z',
        status: 'SCHEDULED',
        homeTeam: { id: HOME, name: 'Home Club', teamName: 'Home', abbreviation: 'HOM' },
        awayTeam: { id: AWAY, name: 'Away Club', teamName: 'Away', abbreviation: 'AWY' },
        venueName: 'Park',
        homeScore: null,
        awayScore: null,
        homeProbablePitcher: 'Home Ace',
        awayProbablePitcher: 'Away Ace',
        estimate: { gamePk: 99, homeWinProbability: 0.6, confidence: 'medium', factors: [] },
        ...overrides,
    },
    weather: { condition: 'Sunny', tempF: 85, wind: '8 mph, Out To CF' },
    probablePitchers: {
        home: { id: 1000, fullName: 'Home Ace', throws: 'R', era: 2.5, inningsPitched: 150 },
        away: { id: 2000, fullName: 'Away Ace', throws: 'L', era: 3.5, inningsPitched: 140 },
    },
    lineupsPosted: true,
    estimate: { gamePk: 99, homeWinProbability: 0.6, confidence: 'medium', factors: [] },
})

const hitter = (id: number, teamId: number, plateAppearances: number): ProviderPlayer => ({
    id,
    fullName: `Hitter ${id}`,
    firstName: 'H',
    lastName: String(id),
    primaryPosition: 'OF',
    teamId,
    teamName: teamId === HOME ? 'Home Club' : 'Away Club',
    teamAbbreviation: null,
    birthDate: null,
    age: null,
    bats: 'R',
    throws: 'R',
    jerseyNumber: null,
    photoUrl: null,
    active: true,
    battingStats: { plateAppearances },
})

const profile = (player: ProviderPlayer, extra: Partial<ProviderPlayerProfile> = {}): ProviderPlayerProfile => ({
    player,
    hitting: { season: { ops: '.800', plateAppearances: 400 }, sabermetrics: null, splits: [], gameLog: [] },
    pitching: null,
    status: { code: 'A', description: 'Active', available: true },
    ...extra,
})

// 12 hitters per team with descending plate appearances, so only the top 10 should be considered.
const roster = (teamId: number) =>
    Array.from({ length: 12 }, (_, i) => hitter(teamId * 100 + i, teamId, 600 - i * 10))

const sportsProvider = (profiles: Record<number, ProviderPlayerProfile> = {}): ISportsProvider =>
    ({
        name: 'fake',
        getPlayersByTeam: vi.fn(async (teamId: number) => roster(teamId)),
        getPlayerProfile: vi.fn(async (id: number) => profiles[id] ?? profile(hitter(id, id < 1500 ? HOME : AWAY, 400))),
    }) as unknown as ISportsProvider

const gamesService = (value: GameDetail | null = detail()): IGamesService => ({
    getUpcomingGames: vi.fn(),
    getGameDetail: vi.fn().mockResolvedValue(value),
})

const teamRepo = (team: unknown = null): IFantasyTeamRepository =>
    ({ findById: vi.fn().mockResolvedValue(team) }) as unknown as IFantasyTeamRepository

const validOutput = (ids: number[]) => ({
    gamePk: 99,
    picks: ids.map((id) => ({ externalPlayerId: id, playerName: `Hitter ${id}`, role: 'start' as const, reason: 'Strong form.' })),
    summary: 'Lean on the home bats.',
})

const openai = (output: unknown): IOpenAIProvider => ({
    complete: vi.fn().mockResolvedValue({ output, tokenUsage: { inputTokens: 1, outputTokens: 1 }, modelUsed: 'm' }),
})

const build = (parts: {
    ai?: IOpenAIProvider
    games?: IGamesService
    sports?: ISportsProvider
    teams?: IFantasyTeamRepository
}) =>
    new GamePicksFeature(
        parts.ai ?? openai(validOutput([100])),
        parts.sports ?? sportsProvider(),
        parts.games ?? gamesService(),
        parts.teams ?? teamRepo(),
        vi.fn().mockResolvedValue([]),
    )

const sentInput = (ai: IOpenAIProvider) =>
    JSON.parse((ai.complete as ReturnType<typeof vi.fn>).mock.calls[0][0].input)

describe('game picks schemas', () => {
    it('input needs a game and leaves the scoring preset open until a team or the default decides it', () => {
        expect(gamePicksInputSchema.safeParse({}).success).toBe(false)
        expect(gamePicksInputSchema.parse({ gamePk: 99 }).scoringPreset).toBeUndefined()
    })

    it('output needs at least one pick', () => {
        expect(gamePicksOutputSchema.safeParse({ gamePk: 1, picks: [], summary: 's' }).success).toBe(false)
    })
})

describe('GamePicksFeature', () => {
    it('returns the picks when every pick is one of the candidates', async () => {
        const result = await build({ ai: openai(validOutput([100, 200])) }).invoke('u1', { gamePk: 99, scoringPreset: 'POINTS' })

        expect(result.output.picks.map((p) => p.externalPlayerId)).toEqual([100, 200])
    })

    it('rejects an answer that names a player who was not a candidate', async () => {
        const feature = build({ ai: openai(validOutput([424242])) })

        await expect(feature.invoke('u1', { gamePk: 99, scoringPreset: 'POINTS' })).rejects.toThrow(/not among the candidates/)
    })

    it('sends the computed estimate and outlook scores so the model cannot invent them', async () => {
        const ai = openai(validOutput([100]))

        await build({ ai }).invoke('u1', { gamePk: 99, scoringPreset: 'CATEGORIES_5X5' })

        const input = sentInput(ai)
        expect(input.estimate.homeWinProbability).toBe(0.6)
        expect(input.scoringPreset).toBe('CATEGORIES_5X5')
        expect(input.candidates[0].outlook).toHaveProperty('score')
    })

    it('considers the 10 busiest hitters of each team plus both probable starters', async () => {
        const ai = openai(validOutput([100]))

        await build({ ai }).invoke('u1', { gamePk: 99, scoringPreset: 'POINTS' })

        const candidates = sentInput(ai).candidates as { externalPlayerId: number }[]
        expect(candidates).toHaveLength(22)
        expect(candidates.some((c) => c.externalPlayerId === 111)).toBe(false)
        expect(candidates.some((c) => c.externalPlayerId === 1000)).toBe(true)
        expect(candidates.some((c) => c.externalPlayerId === 2000)).toBe(true)
    })

    it('judges home hitters against the away starter hand', async () => {
        const weakVsLefties = profile(hitter(100, HOME, 600), {
            hitting: {
                season: { ops: '.800', plateAppearances: 600 },
                sabermetrics: null,
                splits: [{ key: 'vsLeft', stats: { ops: '.500', plateAppearances: 120 } }],
                gameLog: [],
            },
        })
        const ai = openai(validOutput([100]))

        await build({ ai, sports: sportsProvider({ 100: weakVsLefties }) }).invoke('u1', { gamePk: 99, scoringPreset: 'POINTS' })

        const home = (sentInput(ai).candidates as { externalPlayerId: number; outlook: { factors: { key: string }[] } }[]).find(
            (c) => c.externalPlayerId === 100,
        )
        expect(home?.outlook.factors.some((f) => f.key === 'platoon')).toBe(true)
    })

    it('does not call the model for an unknown game', async () => {
        const ai = openai(validOutput([100]))

        await expect(build({ ai, games: gamesService(null) }).invoke('u1', { gamePk: 99, scoringPreset: 'POINTS' })).rejects.toThrow(/not found/)
        expect(ai.complete).not.toHaveBeenCalled()
    })

    it('does not call the model once the game has started', async () => {
        const ai = openai(validOutput([100]))
        const live = detail({ status: 'LIVE' })

        await expect(build({ ai, games: gamesService(live) }).invoke('u1', { gamePk: 99, scoringPreset: 'POINTS' })).rejects.toThrow(/not started/)
        expect(ai.complete).not.toHaveBeenCalled()
    })

    it('does not call the model for a game outside MLB, where player data is thin', async () => {
        const ai = openai(validOutput([100]))
        const winter = detail({ leagueSlug: 'winter-leagues' })

        await expect(build({ ai, games: gamesService(winter) }).invoke('u1', { gamePk: 99 })).rejects.toThrow(/only available for MLB/)
        expect(ai.complete).not.toHaveBeenCalled()
    })

    it('rejects a team owned by another user', async () => {
        const feature = build({ teams: teamRepo({ id: 't', userId: 'someone-else', rosterSlots: [] }) })

        await expect(feature.invoke('u1', { gamePk: 99, teamId: 't', scoringPreset: 'POINTS' })).rejects.toThrow(/not owned/)
    })

    it('includes the saved team roster when a team is given', async () => {
        const ai = openai(validOutput([100]))
        const team = {
            id: 't',
            userId: 'u1',
            rosterSlots: [{ externalPlayerId: 555, playerName: 'Roster Guy', slotPosition: 'SS', playerPosition: 'SS' }],
        }

        await build({ ai, teams: teamRepo(team) }).invoke('u1', { gamePk: 99, teamId: 't', scoringPreset: 'POINTS' })

        expect(JSON.stringify(sentInput(ai).userRoster)).toContain('Roster Guy')
    })

    it('uses the saved team scoring preset when none is sent', async () => {
        const ai = openai(validOutput([100]))
        const team = { id: 't', userId: 'u1', scoringPreset: 'CATEGORIES_5X5', rosterSlots: [] }

        await build({ ai, teams: teamRepo(team) }).invoke('u1', { gamePk: 99, teamId: 't' })

        expect(sentInput(ai).scoringPreset).toBe('CATEGORIES_5X5')
    })

    it('lets an explicit preset win over the saved team', async () => {
        const ai = openai(validOutput([100]))
        const team = { id: 't', userId: 'u1', scoringPreset: 'CATEGORIES_5X5', rosterSlots: [] }

        await build({ ai, teams: teamRepo(team) }).invoke('u1', { gamePk: 99, teamId: 't', scoringPreset: 'POINTS' })

        expect(sentInput(ai).scoringPreset).toBe('POINTS')
    })

    it('falls back to POINTS with no team and no preset', async () => {
        const ai = openai(validOutput([100]))

        await build({ ai }).invoke('u1', { gamePk: 99 })

        expect(sentInput(ai).scoringPreset).toBe('POINTS')
    })
})
