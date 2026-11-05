import { describe, expect, it } from 'vitest'

import { DEFAULT_MIN_SLATE_GAMES, minSlateGames } from './daily-calendar.service'

describe('minSlateGames', () => {
    it('defaults to three real games', () => {
        expect(minSlateGames({})).toBe(DEFAULT_MIN_SLATE_GAMES)
        expect(DEFAULT_MIN_SLATE_GAMES).toBe(3)
    })

    it('can be set with CONTEST_MIN_SLATE_GAMES and ignores bad values', () => {
        expect(minSlateGames({ CONTEST_MIN_SLATE_GAMES: '5' })).toBe(5)
        expect(minSlateGames({ CONTEST_MIN_SLATE_GAMES: '0' })).toBe(3)
        expect(minSlateGames({ CONTEST_MIN_SLATE_GAMES: 'abc' })).toBe(3)
    })
})
