import { randomUUID } from 'node:crypto'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../../src/generated/prisma/client'
import { describe, expect, it } from 'vitest'
import { writeDemoBatch } from './demo-batch'

describe.skipIf(!process.env.TEST_DATABASE_URL)('scheduled demo batches', () => {
    it('stores entries and their events atomically and idempotently', async () => {
        const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.TEST_DATABASE_URL }) })
        const key = randomUUID()
        const user = await db.user.create({ data: { name: 'Fixture', email: `${key}@fixture.invalid`, provider: 'test' } })
        const contest = await db.dailyContest.create({ data: { name: 'Replay', mode: 'REPLAY', leagueSlug: 'mlb', contestDate: '2023-01-01', sourceDate: '2025-01-01', slateKey: key, locksAt: new Date(), games: [], playerPool: [], scoringRule: {} } })
        const at = new Date('2023-01-01T12:00:00Z')
        const rows = [{ profile: { userId: user.id }, picks: { teamName: 'Team', players: [] }, lineup: [], at }]
        try {
            await db.$transaction(tx => writeDemoBatch(tx, contest, rows))
            await db.$transaction(tx => writeDemoBatch(tx, contest, rows))
            expect(await db.dailyEntry.count({ where: { contestId: contest.id, userId: user.id } })).toBe(1)
            const events = await db.communityEvent.findMany({ where: { contestId: contest.id, userId: user.id } })
            expect(events).toHaveLength(1)
            expect(events[0]).toMatchObject({ kind: 'ENTRY_JOINED', occurredAt: at })
        } finally {
            await db.communityEvent.deleteMany({ where: { contestId: contest.id } })
            await db.dailyEntry.deleteMany({ where: { contestId: contest.id } })
            await db.dailyContest.delete({ where: { id: contest.id } })
            await db.user.delete({ where: { id: user.id } })
            await db.$disconnect()
        }
    })
})
