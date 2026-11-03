import { afterEach, describe, expect, it, vi } from 'vitest'
import { DailyCalendarService } from './daily-calendar.service'
import type { ISportsProvider } from '../../providers/sports-provider.interface'

const scheduledGame = { gamePk: 887700, gameDateUtc: '2026-11-01T18:00:00Z', homeTeamId: 1, awayTeamId: 2, status: 'SCHEDULED' as const, doubleHeader: false, homeScore: null, awayScore: null }
const positions = ['SP', 'C', '1B', '2B', '3B', 'SS', 'OF', 'OF', 'OF']
const roster = positions.map((primaryPosition, index) => ({ id: index + 1, fullName: `Player ${index + 1}`, primaryPosition, teamId: 1, teamName: 'Home', photoUrl: null, active: true }))

function makeProvider(emptyTeamId?: number) {
    return {
        getSchedule: vi.fn(async ({ league, season }: { league?: string; season?: number }) => league === 'mlb' && season === 2026 ? [scheduledGame] : []),
        getTeams: vi.fn(async () => [{ id: 1, name: 'Home' }, { id: 2, name: 'Away' }]),
        getPlayersByTeam: vi.fn(async (teamId: number) => teamId === emptyTeamId ? [] : roster),
    } as unknown as ISportsProvider
}

function makeDb() {
    return {
        scoringRule: { findFirst: vi.fn(async () => ({ rules: {} })) },
        dailyContest: { findUnique: vi.fn(async () => null), upsert: vi.fn(async () => ({})) },
    }
}

describe('DailyCalendarService North American publication', () => {
    it('does not publish a slate when any included team has no usable roster', async () => {
        const db = makeDb()
        const result = await new DailyCalendarService(makeProvider(2), db as never).publishDailyContests({ now: new Date('2026-11-01T12:00:00Z'), lookaheadDays: 1 })

        expect(result.published).toBe(0)
        expect(db.dailyContest.upsert).not.toHaveBeenCalled()
    })

    it('publishes a valid Daily Lineup with the frozen team pool', async () => {
        const db = makeDb()
        const result = await new DailyCalendarService(makeProvider(), db as never).publishDailyContests({ now: new Date('2026-11-01T12:00:00Z'), lookaheadDays: 1 })

        expect(result.published).toBe(1)
        expect(db.dailyContest.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ name: expect.stringMatching(/ · Nov 1, 2026$/), leagueSlug: 'north-america', locksAt: new Date(scheduledGame.gameDateUtc) }) }))
    })
})

describe('DailyCalendarService Winter Leagues source', () => {
    afterEach(() => vi.unstubAllEnvs())
    const winterProvider = () => ({
        getSchedule: vi.fn(async ({ league, season }: { league?: string; season?: number }) => league === 'winter-leagues' && season === 2026 ? [scheduledGame] : []),
        getTeams: vi.fn(async () => [{ id: 1, name: 'Home' }, { id: 2, name: 'Away' }]),
        getPlayersByTeam: vi.fn(async () => roster),
    } as unknown as ISportsProvider)

    it('publishes a Winter Leagues slate only when CONTEST_WINTER_ENABLED is true', async () => {
        const off = makeDb()
        expect((await new DailyCalendarService(winterProvider(), off as never).publishDailyContests({ now: new Date('2026-11-01T12:00:00Z'), lookaheadDays: 1 })).published).toBe(0)
        expect(off.dailyContest.upsert).not.toHaveBeenCalled()

        vi.stubEnv('CONTEST_WINTER_ENABLED', 'true')
        const on = makeDb()
        const result = await new DailyCalendarService(winterProvider(), on as never).publishDailyContests({ now: new Date('2026-11-01T12:00:00Z'), lookaheadDays: 1 })
        expect(result.published).toBe(1)
        expect(on.dailyContest.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ leagueSlug: 'winter-leagues', name: expect.stringMatching(/^Winter Leagues · .+ · Nov 1, 2026$/) }) }))
    })
})
