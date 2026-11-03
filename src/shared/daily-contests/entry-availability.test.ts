import { describe, expect, it } from 'vitest'
import { canEditDailyContest } from './entry-availability'

describe('canEditDailyContest', () => {
    const live = { mode: 'LIVE' as const, status: 'OPEN' as const, locksAt: '2026-11-01T20:00:00.000Z' }

    it('allows an open live contest before the deadline', () => {
        expect(canEditDailyContest(live, Date.parse('2026-11-01T19:00:00.000Z'))).toBe(true)
    })

    it('rejects replay, completed, locked, expired and invalid deadlines', () => {
        expect(canEditDailyContest({ ...live, mode: 'REPLAY' }, Date.parse('2026-11-01T19:00:00Z'))).toBe(false)
        expect(canEditDailyContest({ ...live, status: 'COMPLETED' }, Date.parse('2026-11-01T19:00:00Z'))).toBe(false)
        expect(canEditDailyContest(live, Date.parse(live.locksAt))).toBe(false)
        expect(canEditDailyContest({ ...live, locksAt: 'invalid' }, Date.now())).toBe(false)
    })
})
