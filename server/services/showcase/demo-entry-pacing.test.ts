import { describe, expect, it } from 'vitest'

import { demoEntriesDue, demoEntryTarget } from './demo-simulation'

describe('demo entry pacing', () => {
    it('gives a slate with few games a smaller crowd than a full slate', () => {
        const full = demoEntryTarget('2026-11-05', 'classic', 30000, 12)
        const small = demoEntryTarget('2026-11-05', 'classic', 30000, 2)
        expect(small).toBeLessThan(full / 3)
        expect(small).toBeGreaterThan(0)
    })

    it('counts the opening wave at publication and everyone by the lock', () => {
        const createdAt = new Date('2026-11-01T00:00:00Z')
        const locksAt = new Date('2026-11-05T19:00:00Z')
        const contest = { createdAt, locksAt }
        expect(demoEntriesDue(contest, 100, createdAt)).toBeGreaterThanOrEqual(10)
        expect(demoEntriesDue(contest, 100, createdAt)).toBeLessThan(15)
        expect(demoEntriesDue(contest, 100, new Date('2026-11-03T00:00:00Z'))).toBeGreaterThan(10)
        expect(demoEntriesDue(contest, 100, locksAt)).toBe(100)
    })
})
