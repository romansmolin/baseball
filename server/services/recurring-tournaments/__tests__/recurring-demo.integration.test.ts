import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { RecurringRepository } from '../../../repositories/recurring-tournaments/recurring.repository'
import { applyDueRecurringDemoEntries } from '../recurring-demo.service'
import { createTestDb, createTestOwner, removeTestOwner } from './test-db'
import { pool } from './fixtures'
import type { RecurringWindow } from '../recurring.types'

describe.skipIf(!process.env.TEST_DATABASE_URL)('recurring demo enrollment', () => {
    const db = process.env.TEST_DATABASE_URL ? createTestDb() : null!
    let owner: Awaited<ReturnType<typeof createTestOwner>>
    let cohortSeed: string
    let ids: string[] = []
    let day = 2
    const permit = { assertInTransaction: async () => {} }
    beforeAll(async () => {
        vi.stubEnv('SHOWCASE_ENABLED', 'true')
        owner = await createTestOwner(db); cohortSeed = `${owner.user.id}-cohort`
        ids = Array.from({ length: 14 }, (_, i) => `${owner.user.id}-demo-${i}`)
        await db.user.createMany({ data: ids.map((id, i) => ({ id, email: `${id}@managers.invalid`, name: `Manager ${i}`, provider: i === 11 ? 'email' : 'demo', role: i === 10 ? 'ADMIN' : 'USER', passwordHash: i === 12 ? 'protected' : null })) })
        await db.demoProfile.createMany({ data: ids.map((userId, ordinal) => ({ userId, demoKey: `${cohortSeed}-${ordinal}`, datasetSeed: cohortSeed, ordinal, countryCode: 'US', favoriteTeamId: 147, strategy: ['BALANCED', 'PITCHING', 'RISKY'][ordinal % 3] })) })
        await db.payment.create({ data: { userId: ids[13], token: `${cohortSeed}-payment`, amountCents: 500, creditAmount: 50, description: 'Protected fixture' } })
    })
    afterAll(async () => {
        if (owner) {
            await db.payment.deleteMany({ where: { userId: { in: ids } } })
            const leagues = await db.league.findMany({ where: { commissionerId: owner.user.id }, select: { id: true } })
            await db.showcaseJob.deleteMany({ where: { key: { in: leagues.map(l => `recurring:entries:${l.id}`) } } })
            await removeTestOwner(db, owner.user.id)
            await db.demoProfile.deleteMany({ where: { datasetSeed: cohortSeed } })
            await db.user.deleteMany({ where: { id: { in: ids } } })
        }
        await db.$disconnect(); vi.unstubAllEnvs()
    })
    async function fixture() {
        const startsAt = new Date(Date.UTC(2094, 0, day++, 12))
        const window: RecurringWindow = { templateKey: 'weekly-sprint', sourceSlug: 'winter-leagues', startsAt, endsAt: new Date(startsAt.getTime() + 7 * 86400000), totalWeeks: 1, configurationVersion: 1 }
        return (await new RecurringRepository(db).createIfMissing({ window, snapshot: { games: [], playerPool: pool, checkedAt: new Date().toISOString() }, demoTarget: 500, scoringRuleId: owner.rule.id, commissionerId: owner.user.id, mode: 'FUTURE' }, permit)).context
    }
    it('enrolls eligible managers atomically and remains idempotent across concurrent ticks', async () => {
        const context = await fixture(); const now = new Date(context.window.startsAt.getTime() - 1000)
        const run = () => applyDueRecurringDemoEntries(db, { context, now, permit, deadline: Date.now() + 20000, cohortSeed })
        const results = await Promise.all([run(), run()])
        expect(results.reduce((sum, result) => sum + result.inserted, 0)).toBe(10)
        const members = await db.leagueMember.findMany({ where: { leagueId: context.leagueId }, include: { fantasyTeam: { include: { rosterSlots: true } }, weeklyLineups: { include: { slots: true } } } })
        expect(members).toHaveLength(10)
        expect(members.every(member => member.fantasyTeam?.rosterSlots.length === 9 && member.weeklyLineups[0]?.slots.length === 9)).toBe(true)
        expect(members.some(member => ids.slice(10).includes(member.userId))).toBe(false)
        expect(await db.creditTransaction.count({ where: { userId: { in: ids } } })).toBe(0)
        expect((await run()).inserted).toBe(0)
    }, 30000)
    it('skips planned demo joins after the registration deadline', async () => {
        const context = await fixture()
        const result = await applyDueRecurringDemoEntries(db, { context, now: new Date(context.window.startsAt.getTime() + 1), permit, deadline: Date.now() + 20000, cohortSeed })
        expect(result).toMatchObject({ inserted: 0, skippedLate: 10, done: true })
        expect(await db.leagueMember.count({ where: { leagueId: context.leagueId } })).toBe(0)
    })
    it('does not enroll demos while showcase activity is disabled', async () => {
        const context = await fixture(); vi.stubEnv('SHOWCASE_ENABLED', 'false')
        try {
            const result = await applyDueRecurringDemoEntries(db, { context, now: new Date(context.window.startsAt.getTime() - 1000), permit, deadline: Date.now() + 20000, cohortSeed })
            expect(result.inserted).toBe(0)
            expect(await db.leagueMember.count({ where: { leagueId: context.leagueId } })).toBe(0)
        } finally { vi.stubEnv('SHOWCASE_ENABLED', 'true') }
    })
    it('rechecks whether a planned profile became protected before its entry', async () => {
        const context = await fixture()
        await applyDueRecurringDemoEntries(db, { context, now: context.publishedAt, permit, deadline: Date.now() + 20000, cohortSeed })
        const job = await db.showcaseJob.findUniqueOrThrow({ where: { key: `recurring:entries:${context.leagueId}` } })
        const cursor = job.cursor as { offset: number; plan: { userId: string }[] }
        const protectedId = cursor.plan[cursor.offset].userId
        await db.user.update({ where: { id: protectedId }, data: { role: 'ADMIN' } })
        try {
            await applyDueRecurringDemoEntries(db, { context, now: new Date(context.window.startsAt.getTime() - 1000), permit, deadline: Date.now() + 20000, cohortSeed })
            expect(await db.leagueMember.findUnique({ where: { leagueId_userId: { leagueId: context.leagueId, userId: protectedId } } })).toBeNull()
            expect(await db.leagueMember.count({ where: { leagueId: context.leagueId } })).toBe(9)
        } finally { await db.user.update({ where: { id: protectedId }, data: { role: 'USER' } }) }
    })
    it('rolls back teams, membership and cursor when a weekly draft write fails', async () => {
        const context = await fixture()
        const name = `demo_fail_${context.leagueId.replace(/[^a-zA-Z0-9]/g, '')}`
        if (!/^[a-zA-Z0-9_]+$/.test(name) || !/^[a-zA-Z0-9-]+$/.test(context.leagueId)) throw new Error('Unsafe test identifier')
        await db.$executeRawUnsafe(`CREATE FUNCTION "${name}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF EXISTS (SELECT 1 FROM "LeagueMember" WHERE id = NEW."leagueMemberId" AND "leagueId" = '${context.leagueId}') THEN RAISE EXCEPTION 'simulated draft failure'; END IF; RETURN NEW; END $$`)
        await db.$executeRawUnsafe(`CREATE TRIGGER "${name}" BEFORE INSERT ON "WeeklyLineup" FOR EACH ROW EXECUTE FUNCTION "${name}"()`)
        try {
            await expect(applyDueRecurringDemoEntries(db, { context, now: new Date(context.window.startsAt.getTime() - 1000), permit, deadline: Date.now() + 20000, cohortSeed })).rejects.toThrow()
            expect(await db.leagueMember.count({ where: { leagueId: context.leagueId } })).toBe(0)
            expect(await db.fantasyTeam.count({ where: { userId: { in: ids }, leagueMember: { leagueId: context.leagueId } } })).toBe(0)
            expect(await db.showcaseJob.findUnique({ where: { key: `recurring:entries:${context.leagueId}` } })).toBeNull()
        } finally {
            await db.$executeRawUnsafe(`DROP TRIGGER "${name}" ON "WeeklyLineup"`)
            await db.$executeRawUnsafe(`DROP FUNCTION "${name}"()`)
        }
    })
    it('does not start a batch when the time budget is exhausted', async () => {
        const context = await fixture()
        expect(await applyDueRecurringDemoEntries(db, { context, now: context.publishedAt, permit, deadline: Date.now() - 1, cohortSeed })).toEqual({ inserted: 0, skippedLate: 0, done: false })
        expect(await db.showcaseJob.findUnique({ where: { key: `recurring:entries:${context.leagueId}` } })).toBeNull()
    })
})
