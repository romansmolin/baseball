import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { ISportsProvider } from '../../providers/sports-provider.interface'

vi.mock('../../lib/prisma', async () => {
    const { PrismaClient } = await import('../../../src/generated/prisma/client')
    const { PrismaPg } = await import('@prisma/adapter-pg')
    const { resolveShowcaseDatabaseUrl } = await import('../../lib/database-url')
    const connectionString = process.env.TEST_DATABASE_URL ? resolveShowcaseDatabaseUrl(process.env, false) : 'postgresql://unused:unused@127.0.0.1:9/unused'
    return { prisma: new PrismaClient({ adapter: new PrismaPg({ connectionString }) }) }
})

import { prisma } from '../../lib/prisma'
import { DailyCalendarService } from './daily-calendar.service'
import { DailyContestsRepository } from '../../repositories/daily-contests/daily-contests.repository'

const prefix = `weekly-itest-${randomUUID()}`
const positions = ['SP', 'C', '1B', '2B', '3B', 'SS', 'OF', 'OF', 'OF']
const roster = positions.map((primaryPosition, index) => ({ id: index + 1, fullName: `Player ${index + 1}`, primaryPosition, teamId: 1, teamName: 'Home', photoUrl: null, active: true }))
const games = Array.from({ length: 7 }, (_, i) => ({ gamePk: 1890000000 + i, gameDateUtc: `2038-11-${String(i + 1).padStart(2, '0')}T20:00:00Z`, homeTeamId: 1, awayTeamId: 2, status: 'SCHEDULED' as const, doubleHeader: false, homeScore: null, awayScore: null }))
const provider = {
    getSchedule: async ({ league }: { league?: string }) => league === 'mlb' ? games : [],
    getTeams: async () => [{ id: 1, name: 'Home' }, { id: 2, name: 'Away' }],
    getPlayersByTeam: async () => roster,
} as unknown as ISportsProvider
const now = new Date('2038-11-01T17:00:00Z')
const suite = describe.skipIf(!process.env.TEST_DATABASE_URL)
const scopedDb = {
    scoringRule: prisma.scoringRule,
    dailyContest: {
        findUnique: prisma.dailyContest.findUnique.bind(prisma.dailyContest),
        upsert: (args: Parameters<typeof prisma.dailyContest.upsert>[0]) => prisma.dailyContest.upsert({ ...args, create: { ...args.create, id: `${prefix}-${args.create.slateKey}-${args.create.contestDate}` } }),
    },
}

suite('weekly calendar PostgreSQL integration', () => {
    beforeAll(async () => {
        await prisma.scoringRule.create({ data: { name: prefix, rules: {}, isDefault: true } })
        await prisma.user.create({ data: { id: prefix, email: `${prefix}@managers.invalid`, name: 'Weekly Test Manager' } })
    })
    afterAll(async () => {
        await prisma.dailyEntry.deleteMany({ where: { userId: prefix } })
        await prisma.dailyContest.deleteMany({ where: { id: { startsWith: prefix } } })
        await prisma.user.deleteMany({ where: { id: prefix } })
        await prisma.scoringRule.deleteMany({ where: { name: prefix } })
        await prisma.$disconnect()
    })

    it('publishes the week repeatedly and concurrently without changing existing contests or entries', async () => {
        expect(await prisma.dailyContest.count({ where: { mode: 'LIVE', leagueSlug: 'north-america', slateKey: 'classic', contestDate: { gte: '2038-11-01', lte: '2038-11-07' } } })).toBe(0)
        const original = await prisma.dailyContest.create({ data: { id: `${prefix}-existing`, name: 'Existing classic', mode: 'LIVE', leagueSlug: 'north-america', contestDate: '2038-11-01', sourceDate: '2038-11-01', slateKey: 'classic', locksAt: new Date('2038-11-01T19:00:00Z'), scoringRule: {}, games: [{ original: true }], playerPool: [] } })
        const entry = await prisma.dailyEntry.create({ data: { contestId: original.id, userId: prefix, teamName: 'Existing lineup', lineup: [{ original: true }] } })
        const service = new DailyCalendarService(provider, scopedDb as never)
        await Promise.all([service.publishDailyContests({ now }), service.publishDailyContests({ now })])
        const rows = await prisma.dailyContest.findMany({ where: { mode: 'LIVE', leagueSlug: 'north-america', slateKey: 'classic', contestDate: { gte: '2038-11-01', lte: '2038-11-07' } }, orderBy: { contestDate: 'asc' } })
        expect(rows.map(row => row.contestDate)).toEqual(games.map(item => item.gameDateUtc.slice(0, 10)))
        expect(rows[0]).toMatchObject({ id: original.id, locksAt: original.locksAt, games: original.games, playerPool: original.playerPool })
        expect(await prisma.dailyEntry.findUnique({ where: { id: entry.id } })).toMatchObject({ id: entry.id, lineup: entry.lineup, contestId: original.id })
        const repeat = await service.publishDailyContests({ now })
        expect(repeat.published).toBe(0)
        expect((await prisma.dailyContest.findMany({ where: { id: { in: rows.map(row => row.id) } } })).length).toBe(7)
    })

    it('persists only games with rosters and locks before the first included game', async () => {
        const date = '2039-01-15'
        expect(await prisma.dailyContest.count({ where: { mode: 'LIVE', leagueSlug: 'north-america', contestDate: date, slateKey: 'classic' } })).toBe(0)
        const filteredProvider = {
            getSchedule: async ({ league }: { league?: string }) => league === 'mlb' ? [
                { ...games[0], gamePk: 1890000100, gameDateUtc: `${date}T18:00:00Z`, homeTeamId: 3 },
                { ...games[0], gamePk: 1890000101, gameDateUtc: `${date}T20:00:00Z` },
            ] : [],
            getTeams: async () => [{ id: 1, name: 'Home' }, { id: 2, name: 'Away' }, { id: 3, name: 'No roster' }],
            getPlayersByTeam: async (teamId: number) => teamId === 3 ? [] : roster,
        } as unknown as ISportsProvider
        await new DailyCalendarService(filteredProvider, scopedDb as never).publishDailyContests({ now: new Date(`${date}T17:00:00Z`) })
        const contest = await prisma.dailyContest.findUniqueOrThrow({ where: { id: `${prefix}-classic-${date}` } })
        expect(contest.locksAt.toISOString()).toBe(`${date}T20:00:00.000Z`)
        expect(contest.games).toEqual([expect.objectContaining({ gamePk: 1890000101 })])
        expect(contest.playerPool).not.toEqual(expect.arrayContaining([expect.objectContaining({ teamId: 3 })]))
    })

    it('exposes later current contests through pagination when more than twenty exist', async () => {
        const leagueSlug = `${prefix}-pagination`
        const dates = Array.from({ length: 25 }, (_, index) => `2038-12-${String(index + 1).padStart(2, '0')}`)
        await prisma.dailyContest.createMany({ data: dates.map(date => ({ id: `${prefix}-page-${date}`, name: 'Pagination fixture', mode: 'LIVE', status: 'OPEN', leagueSlug, contestDate: date, sourceDate: date, slateKey: 'classic', locksAt: new Date(`${date}T20:00:00Z`), scoringRule: {}, games: [], playerPool: [] })) })
        const page = await new DailyContestsRepository().list({ view: 'current', leagueSlug, limit: 20, offset: 20 })
        expect(page.total).toBe(25)
        expect(page.items.map(item => item.contestDate)).toEqual(dates.slice(20))
    })
})
