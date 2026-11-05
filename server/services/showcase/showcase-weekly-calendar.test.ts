import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../providers/mlb/mlb.provider', () => ({
    MlbSportsProvider: class {
        async getSchedule({ league }: { league?: string }) { return league === 'mlb' ? [{ gamePk: 87, gameDateUtc: '2026-11-07T20:00:00Z', homeTeamId: 1, awayTeamId: 2, status: 'SCHEDULED', doubleHeader: false, homeScore: null, awayScore: null }, { gamePk: 88, gameDateUtc: '2026-11-08T20:00:00Z', homeTeamId: 1, awayTeamId: 2, status: 'SCHEDULED', doubleHeader: false, homeScore: null, awayScore: null }] : [] }
        async getTeams() { return [{ id: 1, name: 'Home' }, { id: 2, name: 'Away' }] }
        async getPlayersByTeam() { return ['SP', 'C', '1B', '2B', '3B', 'SS', 'OF', 'OF', 'OF'].map((primaryPosition, index) => ({ id: index + 1, fullName: `Player ${index + 1}`, primaryPosition, teamId: 1, teamName: 'Home', photoUrl: null, active: true })) }
    },
}))

import { parseShowcaseJobs, tickShowcase } from './showcase-runner'

afterEach(() => vi.unstubAllEnvs())

describe('showcase weekly calendar', () => {
    it('publishes the sixth following date during a normal tick', async () => {
        vi.stubEnv('SHOWCASE_ENABLED', 'true')
        vi.stubEnv('CONTEST_PUBLISHERS_ENABLED', 'true')
        const dates: string[] = []
        const db = {
            showcaseJob: { upsert: vi.fn(async () => ({})), updateMany: vi.fn(async () => ({ count: 1 })), findUnique: vi.fn(async () => null) },
            dailyContest: { findMany: vi.fn(async () => []), findUnique: vi.fn(async () => null), upsert: vi.fn(async ({ create }: { create: { contestDate: string; slateKey: string } }) => { dates.push(`${create.slateKey}:${create.contestDate}`); return create }) },
            demoProfile: { count: vi.fn(async () => 0), findMany: vi.fn(async () => []) },
            scoringRule: { findFirst: vi.fn(async () => ({ rules: {} })) },
        }
        const result = await tickShowcase(db as never, { now: new Date('2026-11-01T17:00:00Z') })
        expect(result).toMatchObject({ acquired: true, result: { published: 2 } })
        expect(dates).toEqual(['classic:2026-11-07', 'weekend:2026-11-07'])
    })

    it('adds the next date when a new day moves the window forward', async () => {
        vi.stubEnv('SHOWCASE_ENABLED', 'true')
        vi.stubEnv('CONTEST_PUBLISHERS_ENABLED', 'true')
        const contests = new Map<string, { contestDate: string }>()
        const jobs = new Map<string, { cursor?: unknown }>()
        const db = {
            showcaseJob: {
                upsert: vi.fn(async ({ where, create, update }: { where: { key: string }; create: { cursor?: unknown }; update: { cursor?: unknown } }) => { const row = jobs.has(where.key) ? { ...jobs.get(where.key), ...update } : create; jobs.set(where.key, row); return row }),
                updateMany: vi.fn(async () => ({ count: 1 })),
                findUnique: vi.fn(async ({ where }: { where: { key: string } }) => jobs.get(where.key) ?? null),
            },
            dailyContest: {
                findMany: vi.fn(async () => []),
                findUnique: vi.fn(async ({ where }: { where: { mode_leagueSlug_contestDate_slateKey: { contestDate: string; slateKey: string } } }) => contests.get(`${where.mode_leagueSlug_contestDate_slateKey.slateKey}:${where.mode_leagueSlug_contestDate_slateKey.contestDate}`) ?? null),
                upsert: vi.fn(async ({ create }: { create: { contestDate: string; slateKey: string } }) => { contests.set(`${create.slateKey}:${create.contestDate}`, create); return create }),
            },
            demoProfile: { count: vi.fn(async () => 0), findMany: vi.fn(async () => []) },
            scoringRule: { findFirst: vi.fn(async () => ({ rules: {} })) },
        }
        await tickShowcase(db as never, { now: new Date('2026-11-01T17:00:00Z') })
        const original = contests.get('classic:2026-11-07')
        await tickShowcase(db as never, { now: new Date('2026-11-02T17:00:00Z') })
        expect([...contests.keys()]).toEqual(['classic:2026-11-07', 'weekend:2026-11-07', 'classic:2026-11-08'])
        expect(contests.get('classic:2026-11-07')).toBe(original)
    })

    it('splits the tick into cron jobs and rejects unknown ones', () => {
        expect(parseShowcaseJobs(null)).toEqual(['entries', 'calendar', 'series'])
        expect(parseShowcaseJobs('series')).toEqual(['series'])
        expect(parseShowcaseJobs('everything')).toBeNull()
    })
})
