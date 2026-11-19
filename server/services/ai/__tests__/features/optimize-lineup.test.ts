import { describe, expect, it } from 'vitest'

import { DEFAULT_SLOT_CONFIG, buildSlots } from '@/shared/team-builder'
import type { PoolPosition } from '@/shared/team-builder'

import { optimizeLineup, type OptimizerPlayer } from '../../features/optimize-lineup'

let nextId = 1
const player = (pos: PoolPosition, points: number | null, extra: Partial<OptimizerPlayer> = {}): OptimizerPlayer => ({
    id: nextId++, name: `${pos}${nextId}`, pos, points, salary: null, available: true, ...extra,
})

const fullPool = () =>
    (['P', 'C', '1B', '2B', '3B', 'SS', 'OF', 'OF', 'OF', 'OF', '1B'] as PoolPosition[]).map((pos, i) =>
        player(pos, 10 + i),
    )

const slots9 = buildSlots(DEFAULT_SLOT_CONFIG)

describe('optimizeLineup', () => {
    it('fills every empty slot and keeps pinned players untouched', () => {
        const pool = fullPool()
        const pinned = [{ slotId: 'SS:0', playerId: pool[5].id, salary: null }]

        const result = optimizeLineup({ slots: slots9, pinned, pool, salaryCap: null })

        expect(result.picks).toHaveLength(8)
        expect(result.picks.map((pick) => pick.slotId)).not.toContain('SS:0')
        expect(result.unfilled).toEqual([])
    })

    it('never duplicates: a pinned player missing from the pool is not picked again, and no player takes two slots', () => {
        const pool = fullPool()
        const result = optimizeLineup({
            slots: slots9,
            pinned: [{ slotId: 'C:0', playerId: 999, salary: null }],
            pool: [...pool, player('C', 99, { id: 999 })],
            salaryCap: null,
        })
        const ids = result.picks.map((pick) => pick.playerId)

        expect(ids).not.toContain(999)
        expect(new Set(ids).size).toBe(ids.length)
    })

    it('respects eligibility: UTIL never gets a pitcher, BENCH takes the best leftover', () => {
        const pool = [player('1B', 10), player('P', 50), player('SS', 12), player('OF', 8)]
        const slots = buildSlots([{ slot: '1B', count: 1 }, { slot: 'UTIL', count: 1 }, { slot: 'BENCH', count: 1 }])

        const result = optimizeLineup({ slots, pinned: [], pool, salaryCap: null })
        const byslot = Object.fromEntries(result.picks.map((pick) => [pick.slotId, pick.playerId]))

        expect(byslot['UTIL:0']).not.toBe(pool[1].id)
        expect(byslot['BENCH:0']).toBe(pool[1].id)
    })

    it('beats a slot-order greedy: the OF-only player must not be spent on UTIL', () => {
        const a = player('OF', 20)
        const b = player('1B', 15)
        const c = player('1B', 14)
        const slots = buildSlots([{ slot: '1B', count: 1 }, { slot: 'UTIL', count: 1 }, { slot: 'OF', count: 1 }])

        const result = optimizeLineup({ slots, pinned: [], pool: [c, b, a], salaryCap: null })

        expect(result.totalPoints).toBe(49)
    })

    it('skips players without a projection and says so', () => {
        const slots = buildSlots([{ slot: 'SS', count: 1 }])

        const result = optimizeLineup({ slots, pinned: [], pool: [player('SS', null)], salaryCap: null })

        expect(result.picks).toEqual([])
        expect(result.unfilled[0]).toMatchObject({ slotId: 'SS:0', code: 'NO_PROJECTION' })
    })

    it('reports a position nobody can fill, still filling the rest', () => {
        const pool = fullPool().filter((p) => p.pos !== 'SS')

        const result = optimizeLineup({ slots: slots9, pinned: [], pool, salaryCap: null })

        expect(result.unfilled).toHaveLength(1)
        expect(result.unfilled[0]).toMatchObject({ slotId: 'SS:0', code: 'NO_ELIGIBLE_PLAYER' })
        expect(result.picks).toHaveLength(8)
    })

    it('empty pool reports POOL_EMPTY', () => {
        const result = optimizeLineup({ slots: slots9, pinned: [], pool: [], salaryCap: null })

        expect(result.unfilled.every((slot) => slot.code === 'POOL_EMPTY')).toBe(true)
    })

    it('cap too low names the budget left and the cheapest price', () => {
        const slots = buildSlots([{ slot: 'SS', count: 1 }, { slot: '1B', count: 1 }])
        const result = optimizeLineup({
            slots,
            pinned: [{ slotId: '1B:0', playerId: 500, salary: 7600 }],
            pool: [player('SS', 20, { salary: 2700 }), player('SS', 25, { salary: 4000 })],
            salaryCap: 10000,
        })

        expect(result.picks).toEqual([])
        expect(result.unfilled[0].code).toBe('CAP_TOO_LOW')
        expect(result.unfilled[0].message).toContain('$2,400')
        expect(result.unfilled[0].message).toContain('$2,700')
    })

    it('under a cap it trades points for price to stay in budget', () => {
        const slots = buildSlots([{ slot: 'SS', count: 1 }, { slot: '1B', count: 1 }])
        const pool = [
            player('SS', 30, { salary: 9000 }), player('SS', 20, { salary: 3000 }),
            player('1B', 25, { salary: 8000 }), player('1B', 15, { salary: 3000 }),
        ]

        const result = optimizeLineup({ slots, pinned: [], pool, salaryCap: 12000 })
        const spent = result.picks.reduce((sum, pick) => sum + (pool.find((p) => p.id === pick.playerId)?.salary ?? 0), 0)

        expect(spent).toBeLessThanOrEqual(12000)
        expect(result.picks).toHaveLength(2)
    })
})
