import { afterEach, describe, expect, it, vi } from 'vitest'
import { tickShowcase } from './showcase-runner'

afterEach(() => vi.unstubAllEnvs())

describe('tickShowcase', () => {
    it('only adds demo entries to live contests and never clones replay templates', async () => {
        vi.stubEnv('SHOWCASE_ENABLED', 'true')
        const contestFindMany = vi.fn(async (query: unknown) => { void query; return [] })
        const contestUpsert = vi.fn()
        const db = {
            showcaseJob: { upsert: vi.fn(async () => ({})), updateMany: vi.fn(async () => ({ count: 1 })), findUnique: vi.fn(async () => null) },
            dailyContest: { findMany: contestFindMany, upsert: contestUpsert },
            demoProfile: { count: vi.fn(async () => 0), findMany: vi.fn(async () => []) },
            scoringRule: { findFirst: vi.fn(async () => null) },
        }

        await tickShowcase(db as never, { now: new Date('2026-11-01T12:00:00Z') })

        expect(contestUpsert).not.toHaveBeenCalled()
        expect(contestFindMany).toHaveBeenCalledTimes(1)
        expect(contestFindMany.mock.calls[0][0]).toMatchObject({ where: { mode: 'LIVE', status: { in: ['OPEN', 'LOCKED'] } } })
    })
})
