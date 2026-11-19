import { describe, expect, it } from 'vitest'

import {
    DEFAULT_CATEGORIES,
    buildCategoryScales,
    type PoolPlayer,
    type ProjectedStats,
} from '@/shared/team-builder'

import { playerCategoryChips, withCategoryView } from '../category-view'

const zero = { r: 0, hr: 0, rbi: 0, sb: 0, ab: 0, h: 0, w: 0, sv: 0, k: 0, ip: 0, er: 0, bbh: 0 }
const hitterStats = (hr: number, sb: number): ProjectedStats => ({ ...zero, side: 'hitting', hr, sb })
const player = (id: number): PoolPlayer => ({
    id, name: `P${id}`, pos: 'OF', team: 'T', leagueSlug: 'mlb', leagueColor: '#000', salary: null, proj: 5, photoUrl: null,
})

describe('playerCategoryChips', () => {
    it('keeps the two best positive categories and skips negative ones', () => {
        expect(playerCategoryChips({ HR: 1.2, SB: 0.8, R: 0.3, RBI: -1 })).toEqual([
            { key: 'HR', value: 1.2 },
            { key: 'SB', value: 0.8 },
        ])
        expect(playerCategoryChips({})).toEqual([])
    })
})

describe('withCategoryView', () => {
    it('scores players against the lineup need: a lineup with no steals lifts the stealer', () => {
        const stats = new Map<number, ProjectedStats>([
            [1, hitterStats(30, 0)], // on the lineup
            [2, hitterStats(30, 0)],
            [3, hitterStats(0, 30)],
            [4, hitterStats(15, 15)],
        ])
        const scales = buildCategoryScales([...stats.values()])

        const view = withCategoryView({
            pool: [player(2), player(3), player(4), player(9)],
            statsById: (id) => stats.get(id),
            scales,
            categories: ['HR', 'SB'],
            rosterIds: [1],
        })
        const byId = new Map(view.map((p) => [p.id, p]))

        expect((byId.get(3)?.score ?? 0)).toBeGreaterThan(byId.get(2)?.score ?? 0)
        expect(byId.get(3)?.categoryChips?.[0].key).toBe('SB')
        // No forecast: no score, no chips.
        expect(byId.get(9)).toMatchObject({ score: null, categoryChips: [] })
        expect(DEFAULT_CATEGORIES).toHaveLength(10)
    })
})
