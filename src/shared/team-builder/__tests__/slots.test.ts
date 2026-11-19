import { describe, expect, it } from 'vitest'

import { DEFAULT_SLOT_CONFIG, buildSlots, slotAcceptsPoolPosition } from '..'

describe('buildSlots', () => {
    it('builds the 9 default slots with OF:0..2', () => {
        expect(buildSlots(DEFAULT_SLOT_CONFIG).map((slot) => slot.id)).toEqual([
            'P:0', 'C:0', '1B:0', '2B:0', '3B:0', 'SS:0', 'OF:0', 'OF:1', 'OF:2',
        ])
    })

    it('builds a custom config with UTIL and BENCH slots', () => {
        const ids = buildSlots([
            { slot: 'P', count: 3 },
            { slot: 'UTIL', count: 1 },
            { slot: 'BENCH', count: 2 },
        ]).map((slot) => slot.id)

        expect(ids).toEqual(['P:0', 'P:1', 'P:2', 'UTIL:0', 'BENCH:0', 'BENCH:1'])
    })

    it('UTIL takes any hitter but no pitcher; BENCH takes anyone', () => {
        expect(slotAcceptsPoolPosition('UTIL:0', 'P')).toBe(false)
        expect(slotAcceptsPoolPosition('UTIL:0', 'SS')).toBe(true)
        expect(slotAcceptsPoolPosition('BENCH:1', 'P')).toBe(true)
        expect(slotAcceptsPoolPosition('OF:2', 'OF')).toBe(true)
        expect(slotAcceptsPoolPosition('OF:2', 'SS')).toBe(false)
    })
})
