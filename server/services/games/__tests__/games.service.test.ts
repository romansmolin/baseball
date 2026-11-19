import { describe, expect, it, vi } from 'vitest'

import type { ProviderGameContext } from '../../../providers/dto/provider-game-context.dto'
import type { ProviderPlayer } from '../../../providers/dto/provider-player.dto'
import type { ProviderGameStatus } from '../../../providers/dto/provider-schedule.dto'
import type { ISportsProvider } from '../../../providers/sports-provider.interface'
import { GamesService } from '../games.service'

const HOUR = 3_600_000

const pitcher = (id: number, name: string, era: string): ProviderPlayer => ({
    id,
    fullName: name,
    firstName: name,
    lastName: name,
    primaryPosition: 'SP',
    teamId: null,
    teamName: null,
    teamAbbreviation: null,
    birthDate: null,
    age: null,
    bats: null,
    throws: 'R',
    jerseyNumber: null,
    photoUrl: null,
    active: true,
    pitchingStats: { era, inningsPitched: '100.0' },
})

const context = (
    gamePk: number,
    status: ProviderGameStatus,
    hoursFromNow: number,
    probablePitchers: ProviderGameContext['probablePitchers'] = { home: null, away: null },
): ProviderGameContext => ({
    game: {
        gamePk,
        gameDateUtc: new Date(Date.now() + hoursFromNow * HOUR).toISOString(),
        homeTeamId: 1,
        awayTeamId: 2,
        status,
        doubleHeader: false,
        homeScore: null,
        awayScore: null,
    },
    venue: { id: 9, name: 'Park' },
    weather: { condition: 'Sunny', tempF: 80, wind: '5 mph, Out To CF' },
    probablePitchers,
    records: { home: { wins: 50, losses: 50 }, away: { wins: 50, losses: 50 } },
    lineupsPosted: true,
})

const provider = (overrides: Partial<ISportsProvider> = {}): ISportsProvider =>
    ({
        name: 'fake',
        getGameContexts: vi.fn().mockResolvedValue([]),
        getGameContext: vi.fn().mockResolvedValue(null),
        getTeamStandings: vi.fn().mockResolvedValue([]),
        getTeams: vi.fn().mockResolvedValue([
            { id: 1, name: 'Home Club', teamName: 'Home', abbreviation: 'HOM', venueName: 'Park' },
            { id: 2, name: 'Away Club', teamName: 'Away', abbreviation: 'AWY', venueName: 'Elsewhere' },
        ]),
        ...overrides,
    }) as unknown as ISportsProvider

describe('GamesService.getUpcomingGames', () => {
    it('adds an estimate to scheduled games only, and drops finished ones', async () => {
        const service = new GamesService(
            provider({
                getGameContexts: vi.fn().mockResolvedValue([
                    context(1, 'SCHEDULED', 3),
                    context(2, 'LIVE', 0.5),
                    context(3, 'FINAL', -2),
                ]),
            }),
        )

        const games = await service.getUpcomingGames(10)

        expect(games.map((g) => g.gamePk)).toEqual([2, 1])
        expect(games.find((g) => g.gamePk === 1)?.estimate).not.toBeNull()
        expect(games.find((g) => g.gamePk === 2)?.estimate).toBeNull()
    })

    it('names the probable pitchers and leans toward the better one', async () => {
        const service = new GamesService(
            provider({
                getGameContexts: vi.fn().mockResolvedValue([
                    context(1, 'SCHEDULED', 3, {
                        home: pitcher(10, 'Ace', '2.00'),
                        away: pitcher(11, 'Scrub', '6.00'),
                    }),
                ]),
            }),
        )

        const [game] = await service.getUpcomingGames(10)

        expect(game.homeProbablePitcher).toBe('Ace')
        expect(game.awayProbablePitcher).toBe('Scrub')
        expect(game.estimate?.homeWinProbability).toBeCloseTo(0.62, 2)
    })

    it('still returns an estimate when the standings call fails', async () => {
        const service = new GamesService(
            provider({
                getGameContexts: vi.fn().mockResolvedValue([context(1, 'SCHEDULED', 3)]),
                getTeamStandings: vi.fn().mockRejectedValue(new Error('standings down')),
            }),
        )

        const [game] = await service.getUpcomingGames(10)

        expect(game.estimate?.homeWinProbability).toBeCloseTo(0.54, 2)
    })

    it('respects the limit', async () => {
        const service = new GamesService(
            provider({
                getGameContexts: vi.fn().mockResolvedValue([
                    context(1, 'SCHEDULED', 1),
                    context(2, 'SCHEDULED', 2),
                    context(3, 'SCHEDULED', 3),
                ]),
            }),
        )

        expect(await service.getUpcomingGames(2)).toHaveLength(2)
    })
})

describe('GamesService.getGameDetail', () => {
    it('returns null for an unknown game', async () => {
        const service = new GamesService(provider())

        await expect(service.getGameDetail(404)).resolves.toBeNull()
    })

    it('returns weather, pitchers with ERA, lineup status and the estimate', async () => {
        const service = new GamesService(
            provider({
                getGameContext: vi.fn().mockResolvedValue(
                    context(7, 'SCHEDULED', 5, { home: pitcher(10, 'Ace', '2.00'), away: null }),
                ),
            }),
        )

        const detail = await service.getGameDetail(7)

        expect(detail?.game.gamePk).toBe(7)
        expect(detail?.weather?.wind).toBe('5 mph, Out To CF')
        expect(detail?.probablePitchers.home).toEqual({
            id: 10,
            fullName: 'Ace',
            throws: 'R',
            era: 2,
            inningsPitched: 100,
        })
        expect(detail?.probablePitchers.away).toBeNull()
        expect(detail?.lineupsPosted).toBe(true)
        expect(detail?.estimate?.confidence).toBe('low')
    })
})
