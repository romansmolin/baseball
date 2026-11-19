import { describe, expect, it } from 'vitest'

import type { UpcomingGameRecord } from '@/shared/games'

import { estimateBarWidths, groupGamesByDate } from './games-grouping'

const game = (gamePk: number, gameDateUtc: string): UpcomingGameRecord => ({
    gamePk,
    gameDateUtc,
    status: 'SCHEDULED',
    homeTeam: { id: 1, name: 'Home', teamName: 'Home', abbreviation: 'HOM' },
    awayTeam: { id: 2, name: 'Away', teamName: 'Away', abbreviation: 'AWY' },
    venueName: null,
    homeScore: null,
    awayScore: null,
    homeProbablePitcher: null,
    awayProbablePitcher: null,
    estimate: null,
})

describe('groupGamesByDate', () => {
    it('groups games by calendar day in the given time zone, earliest day first', () => {
        const groups = groupGamesByDate(
            [game(3, '2026-04-02T00:30:00Z'), game(1, '2026-04-01T01:00:00Z'), game(2, '2026-04-01T23:00:00Z')],
            'UTC',
        )

        expect(groups.map((g) => g.dateKey)).toEqual(['2026-04-01', '2026-04-02'])
        expect(groups[0].games.map((g) => g.gamePk)).toEqual([1, 2])
        expect(groups[1].games.map((g) => g.gamePk)).toEqual([3])
    })

    it('uses the viewer time zone: a late UTC game belongs to the previous evening in New York', () => {
        const groups = groupGamesByDate([game(1, '2026-04-02T00:30:00Z')], 'America/New_York')

        expect(groups[0].dateKey).toBe('2026-04-01')
    })

    it('returns no groups for no games', () => {
        expect(groupGamesByDate([], 'UTC')).toEqual([])
    })
})

describe('estimateBarWidths', () => {
    it('splits the bar by whole percent so the two sides always add up to 100', () => {
        expect(estimateBarWidths(0.564)).toEqual({ home: 56, away: 44 })
        expect(estimateBarWidths(0.5)).toEqual({ home: 50, away: 50 })
    })
})
