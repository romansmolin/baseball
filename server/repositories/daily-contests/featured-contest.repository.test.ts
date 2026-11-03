import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DailyContest } from '../../../src/generated/prisma/client'

const { findFirst } = vi.hoisted(() => ({ findFirst: vi.fn() }))
vi.mock('../../lib/prisma', () => ({ prisma: { dailyContest: { findFirst } } }))

import { DailyContestsRepository } from './daily-contests.repository'

const now = new Date('2026-11-01T17:00:00Z')
const row = (overrides: Partial<DailyContest> = {}): DailyContest & { _count: { entries: number } } => ({
    id: 'featured', name: 'Daily Classic', mode: 'LIVE', status: 'OPEN', leagueSlug: 'mlb',
    contestDate: '2026-11-01', sourceDate: '2026-11-01', slateKey: 'classic', locksAt: new Date('2026-11-01T19:00:00Z'),
    salaryCap: 80000, captainMultiplier: 1.5, scoringRule: {}, games: [], playerPool: [],
    createdAt: now, updatedAt: now, ...overrides, _count: { entries: 1472 },
})

describe('featured contest repository query', () => {
    beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); findFirst.mockReset() })
    afterEach(() => vi.useRealTimers())

    it('queries the nearest future OPEN contest directly, without any page offset or locked-row limit', async () => {
        findFirst.mockResolvedValueOnce(row())
        const result = await new DailyContestsRepository().featured()
        expect(findFirst).toHaveBeenCalledExactlyOnceWith({
            where: { mode: 'LIVE', status: 'OPEN', locksAt: { gt: now } },
            orderBy: [{ locksAt: 'asc' }, { id: 'asc' }], include: { _count: { select: { entries: true } } },
        })
        expect(result).toMatchObject({ id: 'featured', memberCount: 1472, locksAt: '2026-11-01T19:00:00.000Z' })
        expect(result).not.toHaveProperty('playerPool')
    })

    it('queries the newest locked contest across the entire dataset when no entry window remains', async () => {
        findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(row({ id: 'recent', locksAt: now }))
        const result = await new DailyContestsRepository().featured()
        expect(findFirst).toHaveBeenNthCalledWith(2, {
            where: { mode: 'LIVE', OR: [{ status: 'LOCKED' }, { status: 'OPEN', locksAt: { lte: now } }] },
            orderBy: [{ locksAt: 'desc' }, { id: 'asc' }], include: { _count: { select: { entries: true } } },
        })
        expect(result).toMatchObject({ id: 'recent', status: 'LOCKED' })
    })

    it('returns an empty featured slot only after both current-contest queries are empty', async () => {
        findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null)
        expect(await new DailyContestsRepository().featured()).toBeNull()
    })

    it('propagates database failure instead of reporting an empty schedule', async () => {
        findFirst.mockRejectedValueOnce(new Error('database unavailable'))
        await expect(new DailyContestsRepository().featured()).rejects.toThrow('database unavailable')
    })
})
