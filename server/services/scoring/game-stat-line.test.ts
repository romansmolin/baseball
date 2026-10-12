import { describe, expect, it } from 'vitest'

import type { ProviderBoxScore } from '../../providers/dto/provider-schedule.dto'

import { formatGameStatLine } from './game-stat-line'

const batter = (over: Partial<ProviderBoxScore['batters'][number]> = {}) => ({
    externalPlayerId: 1,
    hits: 0,
    doubles: 0,
    triples: 0,
    homeRuns: 0,
    rbi: 0,
    runs: 0,
    stolenBases: 0,
    baseOnBalls: 0,
    strikeOuts: 0,
    ...over,
})

const box = (over: Partial<ProviderBoxScore> = {}): ProviderBoxScore => ({
    gamePk: 1,
    status: 'FINAL',
    batters: [],
    pitchers: [],
    ...over,
})

describe('formatGameStatLine', () => {
    it('lists only non-zero batting stats', () => {
        const line = formatGameStatLine(
            box({ batters: [batter({ hits: 2, homeRuns: 1, rbi: 3 })] }),
            1,
        )
        expect(line).toBe('2 H · 1 HR · 3 RBI')
    })

    it('formats pitching with baseball innings notation', () => {
        const line = formatGameStatLine(
            box({
                pitchers: [
                    {
                        externalPlayerId: 1,
                        inningsPitched: 6 + 2 / 3,
                        strikeOuts: 7,
                        earnedRuns: 2,
                        win: true,
                    },
                ],
            }),
            1,
        )
        expect(line).toBe('6.2 IP · 7 K · 2 ER · W')
    })

    it('returns undefined when the player has no line', () => {
        expect(formatGameStatLine(box(), 1)).toBeUndefined()
    })
})
