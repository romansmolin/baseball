import { describe, expect, it } from 'vitest'

import { mapWithConcurrency } from '../concurrency.utils'

describe('mapWithConcurrency', () => {
    it('preserves input order regardless of completion order', async () => {
        const out = await mapWithConcurrency([10, 1, 5, 2], 2, async (ms) => {
            await new Promise((r) => setTimeout(r, ms))
            return ms * 2
        })
        expect(out).toEqual([20, 2, 10, 4])
    })

    it('never runs more than `limit` tasks at once', async () => {
        let inFlight = 0
        let peak = 0
        await mapWithConcurrency(Array.from({ length: 20 }, (_, i) => i), 4, async () => {
            inFlight++
            peak = Math.max(peak, inFlight)
            await new Promise((r) => setTimeout(r, 5))
            inFlight--
        })
        expect(peak).toBeLessThanOrEqual(4)
        expect(peak).toBeGreaterThan(1)
    })

    it('returns [] for an empty input without invoking fn', async () => {
        let calls = 0
        const out = await mapWithConcurrency([], 4, async () => {
            calls++
            return 1
        })
        expect(out).toEqual([])
        expect(calls).toBe(0)
    })

    it('rejects if any task rejects', async () => {
        await expect(
            mapWithConcurrency([1, 2, 3], 2, async (n) => {
                if (n === 2) throw new Error('boom')
                return n
            }),
        ).rejects.toThrow('boom')
    })
})
