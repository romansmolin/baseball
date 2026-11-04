import { describe, expect, it } from 'vitest'

import { groupByWinterLeague } from './winter-league-split'
import type { DailyScheduledGame } from './daily-schedule.service'

const row = (gamePk: number, homeTeamId: number): DailyScheduledGame => ({
    apiSeason: 2026,
    sourceLeagueSlug: 'winter-leagues',
    game: { gamePk, homeTeamId, awayTeamId: 1, gameDateUtc: '2026-11-05T01:00:00Z', status: 'SCHEDULED', doubleHeader: false, homeScore: null, awayScore: null },
})

describe('groupByWinterLeague', () => {
    it('groups games by the home team league and drops unknown leagues', () => {
        const leagueOf = (_season: number, teamId: number) => ({ 10: 'Liga Venezuela Beisbol Profesional', 11: 'Liga Venezuela Beisbol Profesional', 20: 'Arizona Fall League', 30: 'Somewhere Else' } as Record<number, string>)[teamId]
        const groups = groupByWinterLeague([row(1, 10), row(2, 11), row(3, 20), row(4, 30), row(5, 99)], leagueOf)

        expect(groups.get('winter-lvbp')?.map((r) => r.game.gamePk)).toEqual([1, 2])
        expect(groups.get('winter-afl')?.map((r) => r.game.gamePk)).toEqual([3])
        expect([...groups.keys()]).toHaveLength(2)
    })
})
