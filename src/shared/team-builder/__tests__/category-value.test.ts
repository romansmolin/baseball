import { describe, expect, it } from 'vitest'

import {
    DEFAULT_CATEGORIES,
    buildCategoryScales,
    categoryTotals,
    categoryWeights,
    playerCategoryValues,
    teamBalanceScore,
    type ProjectedStats,
} from '..'

const zero = { r: 0, hr: 0, rbi: 0, sb: 0, ab: 0, h: 0, w: 0, sv: 0, k: 0, ip: 0, er: 0, bbh: 0 }
const hitter = (over: Partial<ProjectedStats> = {}): ProjectedStats => ({ ...zero, side: 'hitting', ...over })
const pitcher = (over: Partial<ProjectedStats> = {}): ProjectedStats => ({ ...zero, side: 'pitching', ...over })

describe('category values', () => {
    it('counting categories are z-scores within the player side; the other side has no value', () => {
        const pool = [hitter({ hr: 10 }), hitter({ hr: 20 }), hitter({ hr: 30 }), pitcher({ w: 5 })]
        const scales = buildCategoryScales(pool)

        const [low, mid, high] = pool.slice(0, 3).map((stats) => playerCategoryValues(stats, scales, DEFAULT_CATEGORIES))
        expect(low.HR).toBeCloseTo(-1.22, 2)
        expect(mid.HR).toBeCloseTo(0, 2)
        expect(high.HR).toBeCloseTo(1.22, 2)
        expect(playerCategoryValues(pool[3], scales, DEFAULT_CATEGORIES).HR).toBeUndefined()
    })

    it('batting average counts volume: .300 over 600 at-bats beats .300 over 100', () => {
        const pool = [hitter({ ab: 600, h: 180 }), hitter({ ab: 100, h: 30 }), hitter({ ab: 500, h: 110 })]
        const scales = buildCategoryScales(pool)

        const big = playerCategoryValues(pool[0], scales, ['AVG']).AVG as number
        const small = playerCategoryValues(pool[1], scales, ['AVG']).AVG as number
        expect(big).toBeGreaterThan(small)
    })

    it('lower ERA is worth more', () => {
        const pool = [pitcher({ ip: 100, er: 30 }), pitcher({ ip: 100, er: 60 }), pitcher({ ip: 100, er: 45 })]
        const scales = buildCategoryScales(pool)

        const ace = playerCategoryValues(pool[0], scales, ['ERA']).ERA as number
        const bad = playerCategoryValues(pool[1], scales, ['ERA']).ERA as number
        expect(ace).toBeGreaterThan(bad)
    })

    it('no volume and a flat pool give zeros, never NaN', () => {
        const pool = [hitter(), pitcher()]
        const scales = buildCategoryScales(pool)

        for (const stats of pool) {
            for (const value of Object.values(playerCategoryValues(stats, scales, DEFAULT_CATEGORIES))) {
                expect(Number.isNaN(value)).toBe(false)
                expect(value).toBe(0)
            }
        }
        const totals = categoryTotals([])
        expect(Object.keys(totals)).toEqual([])
        expect(categoryTotals([hitter()]).AVG).toBeUndefined()
    })

    it('team totals aggregate rates from the sums', () => {
        const totals = categoryTotals([
            hitter({ hr: 5, ab: 100, h: 30 }),
            hitter({ hr: 7, ab: 300, h: 60 }),
            pitcher({ ip: 90, er: 30, bbh: 100 }),
        ])

        expect(totals.HR).toBe(12)
        expect(totals.AVG).toBeCloseTo(90 / 400, 5)
        expect(totals.ERA).toBeCloseTo(3, 5)
        expect(totals.WHIP).toBeCloseTo(100 / 90, 5)
    })

    it('weights grow with weakness and are capped', () => {
        expect(categoryWeights([{ SB: -1 }, { SB: -1 }], ['SB']).SB).toBe(2)
        expect(categoryWeights([{ SB: 1 }], ['SB']).SB).toBe(1)
        expect(categoryWeights([{ SB: -3 }], ['SB']).SB).toBe(2.5)
        expect(categoryWeights([], ['SB']).SB).toBe(1)
    })

    it('balance prefers a lineup spread across categories over one stacked in a single category', () => {
        const spread = teamBalanceScore([{ HR: 1, SB: 1 }, { HR: 1, SB: 1 }], ['HR', 'SB'])
        const stacked = teamBalanceScore([{ HR: 2, SB: 0 }, { HR: 2, SB: 0 }], ['HR', 'SB'])

        expect(spread).toBeGreaterThan(stacked)
    })
})
