import { describe, expect, it } from 'vitest'

import type { UpcomingGameRecord } from '@/shared/games'

import { favouriteOf, matchesQuery, pickSpotlight, slateStats } from './games-board'

const game = (gamePk: number, homeWin: number | null, extra: Partial<UpcomingGameRecord> = {}): UpcomingGameRecord => ({
    gamePk,
    gameDateUtc: '2026-04-01T23:00:00Z',
    status: 'SCHEDULED',
    homeTeam: { id: 1, name: 'Home Club', teamName: 'Home', abbreviation: 'HOM' },
    awayTeam: { id: 2, name: 'Away Club', teamName: 'Away', abbreviation: 'AWY' },
    venueName: 'Park',
    homeScore: null,
    awayScore: null,
    homeProbablePitcher: 'Ace H',
    awayProbablePitcher: null,
    estimate: homeWin === null ? null : { gamePk, homeWinProbability: homeWin, confidence: 'medium', factors: [] },
    ...extra,
})

describe('games board helpers', () => {
    it('names the favourite with a probability of 50% or more', () => {
        expect(favouriteOf(game(1, 0.3))).toMatchObject({ side: 'away', abbreviation: 'AWY', probability: 0.7 })
        expect(favouriteOf(game(2, null))).toBeNull()
    })

    it('summarises a slate', () => {
        const stats = slateStats([game(1, 0.7), game(2, 0.52), game(3, 0.2, { awayProbablePitcher: 'Ace A' })])

        expect(stats).toMatchObject({ games: 3, tossUps: 1, startersNamed: 1, strongestOpponent: 'HOM' })
        expect(stats.strongest?.probability).toBeCloseTo(0.8)
    })

    it('spotlights the game with the biggest edge, or the first one without estimates', () => {
        expect(pickSpotlight([game(1, 0.55), game(2, 0.25), game(3, 0.6)])?.gamePk).toBe(2)
        expect(pickSpotlight([game(1, null), game(2, null)])?.gamePk).toBe(1)
        expect(pickSpotlight([])).toBeNull()
    })

    it('searches teams, starters and venue', () => {
        expect(matchesQuery(game(1, 0.5), 'ace h')).toBe(true)
        expect(matchesQuery(game(1, 0.5), 'away club')).toBe(true)
        expect(matchesQuery(game(1, 0.5), 'zzz')).toBe(false)
    })
})
