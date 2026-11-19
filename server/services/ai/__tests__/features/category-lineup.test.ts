import { describe, expect, it } from 'vitest'

import { buildCategoryScales, buildSlots, type PoolPosition, type ProjectedStats } from '@/shared/team-builder'

import { planCategoryLineup, type CategoryPlayer } from '../../features/category-lineup'

const zero = { r: 0, hr: 0, rbi: 0, sb: 0, ab: 0, h: 0, w: 0, sv: 0, k: 0, ip: 0, er: 0, bbh: 0 }
let nextId = 1
const hitter = (hr: number, sb: number, pos: PoolPosition = 'OF'): CategoryPlayer => ({
    id: nextId++, name: `H${nextId}`, pos, points: 1, salary: null, available: true,
    stats: { ...zero, side: 'hitting', hr, sb, ab: 20, h: 5 },
})
const pitcher = (k: number): CategoryPlayer => ({
    id: nextId++, name: `P${nextId}`, pos: 'P', points: 1, salary: null, available: true,
    stats: { ...zero, side: 'pitching', k, ip: 6, er: 2, bbh: 7 },
})

const run = (over: Partial<Parameters<typeof planCategoryLineup>[0]> & Pick<Parameters<typeof planCategoryLineup>[0], 'slots' | 'pool'>) => {
    const scales = buildCategoryScales(over.pool.flatMap((p) => (p.stats ? [p.stats as ProjectedStats] : [])))
    return planCategoryLineup({ pinned: [], scales, categories: ['HR', 'SB'], salaryCap: null, ...over })
}

describe('planCategoryLineup', () => {
    it('picks the base stealer when the lineup has power but no steals, at equal overall value', () => {
        // Equal spread in HR and SB: slugger and stealer are worth the same on raw totals.
        const pinned1B = hitter(30, 0, '1B')
        const slugger = hitter(30, 0)
        const stealer = hitter(0, 30)
        const pool = [pinned1B, slugger, stealer, hitter(15, 15), hitter(15, 15)]

        const result = run({
            slots: buildSlots([{ slot: '1B', count: 1 }, { slot: 'OF', count: 1 }]),
            pinned: [{ slotId: '1B:0', playerId: pinned1B.id, salary: null }],
            pool,
        })

        expect(result.picks).toEqual([{ slotId: 'OF:0', playerId: stealer.id }])
    })

    it('keeps hand-picked players and never uses a player twice', () => {
        const pinned = hitter(25, 5, 'OF')
        const pool = [pinned, hitter(10, 10), hitter(12, 3), hitter(30, 1)]

        const result = run({
            slots: buildSlots([{ slot: 'OF', count: 3 }]),
            pinned: [{ slotId: 'OF:1', playerId: pinned.id, salary: null }],
            pool,
        })
        const ids = result.picks.map((pick) => pick.playerId)

        expect(result.picks.map((pick) => pick.slotId)).not.toContain('OF:1')
        expect(ids).not.toContain(pinned.id)
        expect(new Set(ids).size).toBe(ids.length)
    })

    it('with only hitting categories on, pitcher slots are still filled', () => {
        const pool = [hitter(20, 5), hitter(10, 2), pitcher(80), pitcher(60)]

        const result = run({
            slots: buildSlots([{ slot: 'P', count: 1 }, { slot: 'OF', count: 1 }]),
            pool,
        })

        expect(result.unfilled).toEqual([])
        expect(result.picks).toHaveLength(2)
    })

    it('players without stats are skipped with the no-projection reason', () => {
        const noStats: CategoryPlayer = { id: 999, name: 'X', pos: 'SS', points: null, salary: null, available: true, stats: null }

        const result = run({ slots: buildSlots([{ slot: 'SS', count: 1 }]), pool: [noStats] })

        expect(result.picks).toEqual([])
        expect(result.unfilled[0]).toMatchObject({ slotId: 'SS:0', code: 'NO_PROJECTION' })
    })
})
