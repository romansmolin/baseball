import { describe, expect, it, vi } from 'vitest'
import { retireOpenReplays } from './retire-open-replays'

describe('retireOpenReplays', () => {
    it('dry run reports candidates without writing or acquiring a lease', async () => {
        const db = {
            dailyContest: { count: vi.fn(async () => 3), updateMany: vi.fn() },
            showcaseJob: { upsert: vi.fn(), updateMany: vi.fn() },
        }

        const result = await retireOpenReplays(db as never, { dryRun: true, now: new Date('2026-11-01T12:00:00Z') })

        expect(result).toEqual({ candidates: 3, cancelled: 0, acquired: false })
        expect(db.dailyContest.updateMany).not.toHaveBeenCalled()
        expect(db.showcaseJob.upsert).not.toHaveBeenCalled()
    })

    it('cancels only unfinished replay rows under the showcase lease', async () => {
        const db = {
            dailyContest: { count: vi.fn(async () => 2), updateMany: vi.fn(async () => ({ count: 2 })) },
            showcaseJob: { upsert: vi.fn(async () => ({})), updateMany: vi.fn(async () => ({ count: 1 })) },
        }

        const result = await retireOpenReplays(db as never, { dryRun: false, now: new Date('2026-11-01T12:00:00Z') })

        expect(result).toEqual({ candidates: 2, cancelled: 2, acquired: true })
        expect(db.dailyContest.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ mode: 'REPLAY', status: { in: ['OPEN', 'LOCKED'] } }), data: { status: 'CANCELLED' } }))
    })
})
