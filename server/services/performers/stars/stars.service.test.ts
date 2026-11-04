import { describe, expect, it } from 'vitest'

import { formatStatLine } from './stars.service'

const batter = { externalPlayerId: 1, hits: 3, doubles: 1, triples: 0, homeRuns: 2, rbi: 5, runs: 2, stolenBases: 0, baseOnBalls: 0, strikeOuts: 1 }

describe('formatStatLine', () => {
    it('lists the biggest batting numbers, at most three', () => {
        expect(formatStatLine(batter)).toBe('2 HR · 5 RBI · 3 H')
    })

    it('prints innings the way baseball does', () => {
        expect(formatStatLine(undefined, { externalPlayerId: 2, inningsPitched: 6 + 2 / 3, strikeOuts: 9, earnedRuns: 1, win: true })).toBe('6.2 IP · 9 K · 1 ER · W')
    })
})
