import { describe, expect, it } from 'vitest'

import type { ProviderPerformerLine } from '../../../providers/dto/provider-performer.dto'
import { hittingPoints, pitchingPoints } from '../fantasy-points'
import { buildPerformerDetail } from '../performer-detail'
import { rank } from '../performers.service'

const line = (playerId: number, stat: ProviderPerformerLine['stat']): ProviderPerformerLine & { league: 'mlb' } => ({
    league: 'mlb',
    playerId,
    fullName: `P${playerId}`,
    teamId: 1,
    teamName: 'Team',
    position: null,
    stat,
})

describe('fantasy points', () => {
    it('scores a hitting line', () => {
        // 3 singles + HR (4) + 2 RBI + 1 R + 1 BB - 2 K * 0.5 = 3 + 4 + 2 + 1 + 1 - 1
        expect(hittingPoints({ hits: 4, homeRuns: 1, rbi: 2, runs: 1, baseOnBalls: 1, strikeOuts: 2 })).toBe(10)
    })

    it('scores a pitching line from innings written as 6.1', () => {
        // 19 outs + 7 K - 2 ER*2 - 0.5 * (4 H + 1 BB) + 5 W = 19 + 7 - 4 - 2.5 + 5
        expect(
            pitchingPoints({ inningsPitched: '6.1', strikeOuts: 7, earnedRuns: 2, hits: 4, baseOnBalls: 1, wins: 1 }),
        ).toBe(24.5)
    })
})

describe('rank', () => {
    it('orders by points, not by the provider volume order, and applies the limit', () => {
        const top = rank(
            [line(1, { hits: 1 }), line(2, { hits: 3, homeRuns: 1 }), line(3, { hits: 2 })],
            'hitting',
            2,
        )
        expect(top.map((p) => p.playerId)).toEqual([2, 3])
    })
})

describe('buildPerformerDetail', () => {
    const game = (date: string, hits: number, atBats: number, homeRuns = 0) => ({
        date,
        opponentName: 'Opp',
        stat: { summary: `${hits}-${atBats}`, hits, atBats, homeRuns, rbi: homeRuns, runs: homeRuns },
    })
    const log = {
        games: [game('2026-11-01', 0, 4), game('2026-11-12', 2, 4), game('2026-11-14', 3, 4, 1)],
        season: { hits: 5, atBats: 12, homeRuns: 1, obp: '.400', slg: '.500', ops: '.900', avg: '.417' },
    }
    const detail = buildPerformerDetail({
        player: { id: 1, fullName: 'P', primaryPosition: '1B', teamName: 'T' },
        league: 'mlb',
        group: 'hitting',
        log,
        windowStart: '2026-11-10',
    })

    it('splits the games into the window and the rest, and totals the window points', () => {
        expect(detail.games.map((g) => g.inWindow)).toEqual([false, true, true])
        expect(detail.windowGames).toBe(2)
        // 2 singles = 2; 2 singles + HR (4) + RBI + run = 8
        expect(detail.points).toBe(10)
    })

    it('makes the chart parts add up to the points', () => {
        expect(detail.mix.reduce((sum, part) => sum + part.points, 0)).toBe(detail.points)
    })
})
