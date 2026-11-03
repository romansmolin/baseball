import { describe, expect, it, vi } from 'vitest'
import type { ISportsProvider } from '../../providers/sports-provider.interface'
import { DailyCalendarService } from './daily-calendar.service'
import { WorkDeadlineError } from '../showcase/work-deadline'

const positions = ['SP', 'C', '1B', '2B', '3B', 'SS', 'OF', 'OF', 'OF']
const roster = positions.map((primaryPosition, index) => ({ id: index + 1, fullName: `Player ${index + 1}`, primaryPosition, teamId: 1, teamName: 'Home', photoUrl: null, active: true }))
const game = (gamePk: number, gameDateUtc: string) => ({ gamePk, gameDateUtc, homeTeamId: 1, awayTeamId: 2, status: 'SCHEDULED' as const, doubleHeader: false, homeScore: null, awayScore: null })

function setup(games: ReturnType<typeof game>[]) {
    const saved = new Map<string, { contestDate: string; games: unknown }>()
    const provider = {
        getSchedule: vi.fn(async ({ league }: { league?: string }) => league === 'mlb' ? games : []),
        getTeams: vi.fn(async () => [{ id: 1, name: 'Home' }, { id: 2, name: 'Away' }]),
        getPlayersByTeam: vi.fn(async () => roster),
    } as unknown as ISportsProvider
    const db = {
        scoringRule: { findFirst: vi.fn(async () => ({ rules: {} })) },
        dailyContest: {
            findUnique: vi.fn(async ({ where }: { where: { mode_leagueSlug_contestDate_slateKey: { contestDate: string } } }) => saved.get(where.mode_leagueSlug_contestDate_slateKey.contestDate) ?? null),
            upsert: vi.fn(async ({ create }: { create: { contestDate: string; games: unknown } }) => { saved.set(create.contestDate, create); return create }),
        },
    }
    return { db, provider, saved }
}

describe('seven-day daily calendar', () => {
    it('publishes today and the next six New York dates, including a late UTC game', async () => {
        const games = Array.from({ length: 8 }, (_, i) => game(i + 1, `2026-11-${String(i + 1).padStart(2, '0')}T20:00:00Z`))
        games.push(game(99, '2026-11-08T00:30:00Z'))
        const { db, provider, saved } = setup(games)
        const result = await new DailyCalendarService(provider, db as never).publishDailyContests({ now: new Date('2026-11-01T17:00:00Z') })
        expect(result.published).toBe(7)
        expect([...saved.keys()]).toEqual(['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07'])
        expect(saved.get('2026-11-07')?.games).toEqual(expect.arrayContaining([expect.objectContaining({ gamePk: 99 })]))
        expect(saved.has('2026-11-08')).toBe(false)
    })

    it.each([
        { now: '2026-10-30T16:00:00Z', days: ['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'] },
        { now: '2026-12-29T16:00:00Z', days: ['2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03', '2027-01-04'] },
    ])('covers seven NY dates across DST and year boundaries starting $now', async ({ now, days }) => {
        const { db, provider, saved } = setup(days.map((day, index) => game(index + 1, `${day}T20:00:00Z`)))
        await new DailyCalendarService(provider, db as never).publishDailyContests({ now: new Date(now) })
        expect([...saved.keys()]).toEqual(days)
    })

    it('preserves existing contests when the same weekly publication is repeated', async () => {
        const { db, provider, saved } = setup([game(1, '2026-11-01T20:00:00Z'), game(2, '2026-11-07T20:00:00Z')])
        const service = new DailyCalendarService(provider, db as never)
        expect((await service.publishDailyContests({ now: new Date('2026-11-01T17:00:00Z') })).published).toBe(2)
        const existing = saved.get('2026-11-01')
        expect((await service.publishDailyContests({ now: new Date('2026-11-01T17:00:00Z') })).published).toBe(0)
        expect(saved.get('2026-11-01')).toBe(existing)
        expect(saved.size).toBe(2)
    })

    it('publishes nothing when the deadline hits during roster loading and completes on retry', async () => {
        const { db, provider, saved } = setup([game(1, '2026-11-01T20:00:00Z'), game(2, '2026-11-07T20:00:00Z')])
        let requests = 0
        vi.mocked(provider.getPlayersByTeam).mockImplementation(async () => {
            if (++requests === 1) throw new WorkDeadlineError()
            return roster as never
        })
        const service = new DailyCalendarService(provider, db as never)
        await expect(service.publishDailyContests({ now: new Date('2026-11-01T17:00:00Z') })).rejects.toBeInstanceOf(WorkDeadlineError)
        expect(saved.size).toBe(0)
        vi.mocked(provider.getPlayersByTeam).mockImplementation(async () => roster as never)
        expect((await service.publishDailyContests({ now: new Date('2026-11-01T17:00:00Z') })).published).toBe(2)
        expect([...saved.keys()]).toEqual(['2026-11-01', '2026-11-07'])
    })

    it('skips a day with an unavailable roster while retaining other valid days', async () => {
        const { db, provider, saved } = setup([game(1, '2026-11-01T20:00:00Z'), { ...game(2, '2026-11-03T20:00:00Z'), homeTeamId: 3 }])
        vi.mocked(provider.getPlayersByTeam).mockImplementation(async teamId => teamId === 3 ? [] : roster as never)
        await new DailyCalendarService(provider, db as never).publishDailyContests({ now: new Date('2026-11-01T17:00:00Z') })
        expect([...saved.keys()]).toEqual(['2026-11-01'])
    })

    it.each(['empty', 'error'])('excludes only games with unavailable rosters (%s) and locks at the first remaining game', async failure => {
        const missing = { ...game(1, '2026-11-01T18:00:00Z'), homeTeamId: 3, awayTeamId: 4 }
        const eligible = game(2, '2026-11-01T20:00:00Z')
        const { db, provider, saved } = setup([missing, eligible])
        vi.mocked(provider.getPlayersByTeam).mockImplementation(async teamId => {
            if (teamId === 3) { if (failure === 'error') throw new Error('Roster unavailable'); return [] }
            return (teamId === 4 ? roster.map(player => ({ ...player, id: player.id + 100, teamId: 4 })) : roster) as never
        })
        const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
        try {
            const result = await new DailyCalendarService(provider, db as never).publishDailyContests({ now: new Date('2026-11-01T17:00:00Z') })
            expect(result.published).toBe(1)
            expect(saved.get('2026-11-01')?.games).toEqual([expect.objectContaining({ gamePk: 2 })])
            expect(saved.get('2026-11-01')).toMatchObject({ locksAt: new Date('2026-11-01T20:00:00Z'), playerPool: expect.not.arrayContaining([expect.objectContaining({ teamId: 4 })]) })
        } finally { warning.mockRestore() }
    })

    it('does not publish when remaining games cannot fill the nine-player lineup', async () => {
        const missing = { ...game(1, '2026-11-01T18:00:00Z'), homeTeamId: 3 }
        const eligible = game(2, '2026-11-01T20:00:00Z')
        const { db, provider, saved } = setup([missing, eligible])
        vi.mocked(provider.getPlayersByTeam).mockImplementation(async teamId => teamId === 3 ? [] : roster.slice(0, 4) as never)
        await new DailyCalendarService(provider, db as never).publishDailyContests({ now: new Date('2026-11-01T17:00:00Z') })
        expect(saved.size).toBe(0)
    })

    it('continues to later dates when a team roster request fails for one day', async () => {
        const { db, provider, saved } = setup([game(1, '2026-11-01T20:00:00Z'), { ...game(2, '2026-11-03T20:00:00Z'), homeTeamId: 3 }, game(3, '2026-11-07T20:00:00Z')])
        vi.mocked(provider.getPlayersByTeam).mockImplementation(async teamId => {
            if (teamId === 3) throw new Error('Roster unavailable')
            return roster as never
        })
        const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
        try {
            const result = await new DailyCalendarService(provider, db as never).publishDailyContests({ now: new Date('2026-11-01T17:00:00Z') })
            expect(result.published).toBe(2)
            expect([...saved.keys()]).toEqual(['2026-11-01', '2026-11-07'])
        } finally { warning.mockRestore() }
    })

    it('continues with other baseball leagues when one source fails', async () => {
        const { db, provider, saved } = setup([])
        vi.mocked(provider.getSchedule).mockImplementation(async ({ league }) => {
            if (league === 'mlb') throw new Error('Source unavailable')
            return league === 'triple-a' ? [game(4, '2026-11-07T20:00:00Z')] : []
        })
        const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
        try {
            const result = await new DailyCalendarService(provider, db as never).publishDailyContests({ now: new Date('2026-11-01T17:00:00Z') })
            expect(result.published).toBe(1)
            expect([...saved.keys()]).toEqual(['2026-11-07'])
        } finally { warning.mockRestore() }
    })
})
