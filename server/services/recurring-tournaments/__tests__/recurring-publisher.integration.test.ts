import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { publishRecurringTournaments } from '../recurring-publisher.service'
import { FixtureProvider, game } from './fixtures'
import { createTestDb, createTestOwner, removeTestOwner } from './test-db'

describe.skipIf(!process.env.TEST_DATABASE_URL)('recurring publication', () => {
    const db = process.env.TEST_DATABASE_URL ? createTestDb() : null!
    let owner: Awaited<ReturnType<typeof createTestOwner>>
    const now = new Date('2091-11-05T10:00:00Z')
    const permit = { assertInTransaction: async () => {} }
    beforeAll(async () => { owner = await createTestOwner(db); await db.scoringRule.update({ where: { id: owner.rule.id }, data: { isDefault: true } }) })
    afterAll(async () => {
        await db.league.deleteMany({ where: { recurringTournament: { sourceSlug: 'north-america', startsAt: { gte: new Date('2091-11-01'), lt: new Date('2091-12-01') } } } })
        if (owner) await removeTestOwner(db, owner.user.id)
        await db.$disconnect()
    })

    it('has a completely read-only dry run', async () => {
        const readOnly = createTestDb({ readOnly: true })
        try {
            const result = await publishRecurringTournaments(readOnly, new FixtureProvider(), { now, dryRun: true })
            expect(result.created).toBe(0)
            expect(result.candidates).toHaveLength(1)
        } finally { await readOnly.$disconnect() }
    })

    it('publishes valid short windows concurrently without duplicating or changing snapshots', async () => {
        const provider = new FixtureProvider(); provider.games = [game, { ...game, gamePk: game.gamePk + 1, gameDateUtc: '2091-11-13T20:00:00Z' }]
        const results = await Promise.all([publishRecurringTournaments(db, provider, { now, dryRun: false, permit }), publishRecurringTournaments(db, provider, { now, dryRun: false, permit })])
        expect(results.reduce((sum, r) => sum + r.created, 0)).toBe(2)
        const before = await db.recurringTournament.findMany({ where: { startsAt: { gte: new Date('2091-11-01'), lt: new Date('2091-12-01') } }, orderBy: { startsAt: 'asc' } })
        expect(before.map(r => r.startsAt.getUTCDate())).toEqual([5, 12])
        expect(before.every(r => r.demoTarget >= 400 && r.demoTarget <= 900)).toBe(true)
        provider.games = []
        const repeat = await publishRecurringTournaments(db, provider, { now, dryRun: false, permit })
        expect(repeat.created).toBe(0)
        expect(repeat.existing).toBe(2)
        expect(await db.recurringTournament.findMany({ where: { id: { in: before.map(r => r.id) } }, orderBy: { startsAt: 'asc' } })).toEqual(before)
    })

    it('refuses publication when the database clock passed the proposed start', async () => {
        const provider = new FixtureProvider(); provider.games = [{ ...game, gameDateUtc: '2020-11-02T20:00:00Z' }]
        const result = await publishRecurringTournaments(db, provider, { now: new Date('2020-11-02T10:00:00Z'), dryRun: false, permit })
        expect(result.created).toBe(0)
        expect(result.skipped.some(r => r.reason === 'REGISTRATION_CLOSED')).toBe(true)
    })
})
