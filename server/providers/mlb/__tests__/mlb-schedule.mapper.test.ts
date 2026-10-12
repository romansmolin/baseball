import { describe, expect, it } from 'vitest'

import { mapMlbScheduleGameToProvider } from '../mappers/mlb-schedule.mapper'

const base = {
    gamePk: 1,
    gameDate: '2026-10-10T23:05:00Z',
    status: { abstractGameState: 'Final', detailedState: 'Final' },
}

describe('mapMlbScheduleGameToProvider scores', () => {
    it('maps runs when present', () => {
        const game = mapMlbScheduleGameToProvider({
            ...base,
            teams: { home: { team: { id: 1 }, score: 5 }, away: { team: { id: 2 }, score: 3 } },
        })
        expect(game.homeScore).toBe(5)
        expect(game.awayScore).toBe(3)
    })

    it('returns null scores before the game starts even if MLB sends 0', () => {
        const game = mapMlbScheduleGameToProvider({
            ...base,
            status: { abstractGameState: 'Preview', detailedState: 'Scheduled' },
            teams: { home: { team: { id: 1 }, score: 0 }, away: { team: { id: 2 }, score: 0 } },
        })
        expect(game.homeScore).toBeNull()
        expect(game.awayScore).toBeNull()
    })
})
