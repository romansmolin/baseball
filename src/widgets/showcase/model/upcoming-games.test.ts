import { describe, expect, it } from 'vitest'
import { selectUpcomingGames, type UpcomingGame } from './upcoming-games'

const now = Date.parse('2026-11-01T17:00:00Z')
const game = (overrides: Partial<UpcomingGame> = {}): UpcomingGame => ({
    gamePk: 1, gameDateUtc: '2026-11-01T20:00:00Z', status: 'SCHEDULED',
    awayTeamName: 'Away club', homeTeamName: 'Home club', ...overrides,
})

describe('upcoming game selection', () => {
    it('selects the four nearest scheduled games in chronological order', () => {
        const games = [game({ gamePk: 5, gameDateUtc: '2026-11-03T20:00:00Z' }), game({ gamePk: 2, gameDateUtc: '2026-11-01T19:00:00Z' }), game(), game({ gamePk: 3, gameDateUtc: '2026-11-02T20:00:00Z' }), game({ gamePk: 4, gameDateUtc: '2026-11-03T19:00:00Z' })]
        expect(selectUpcomingGames(games, now).map(item => item.gamePk)).toEqual([2, 1, 3, 4])
        expect(games[0].gamePk).toBe(5)
    })

    it('excludes games that have started, finished, been postponed, or have no valid date', () => {
        expect(selectUpcomingGames([
            game({ gamePk: 1, gameDateUtc: '2026-11-01T17:00:00Z' }),
            game({ gamePk: 2, status: 'LIVE' }), game({ gamePk: 3, status: 'FINAL' }),
            game({ gamePk: 4, status: 'POSTPONED' }), game({ gamePk: 5, status: 'CANCELLED' }),
            game({ gamePk: 6, gameDateUtc: 'invalid' }), game({ gamePk: 7 }),
        ], now).map(item => item.gamePk)).toEqual([7])
    })

    it('does not display the same game twice and handles an unavailable clock', () => {
        expect(selectUpcomingGames([game(), game(), game({ gamePk: 2 })], now).map(item => item.gamePk)).toEqual([1, 2])
        expect(selectUpcomingGames([game()], Number.NaN)).toEqual([])
    })
})
