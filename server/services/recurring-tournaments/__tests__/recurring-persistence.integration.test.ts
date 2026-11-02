import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { RecurringRepository } from '../../../repositories/recurring-tournaments/recurring.repository'
import { createTestDb, createTestOwner, removeTestOwner } from './test-db'
import type { RecurringWindow, RecurringSourceSnapshot } from '../recurring.types'

const suite = describe.skipIf(!process.env.TEST_DATABASE_URL)
suite('recurring tournament persistence', () => {
    const db = process.env.TEST_DATABASE_URL ? createTestDb() : null!
    let owner: Awaited<ReturnType<typeof createTestOwner>>
    const permit = { assertInTransaction: async () => {} }
    const window = (day: number): RecurringWindow => ({ templateKey: 'weekly-sprint', sourceSlug: 'winter-leagues', startsAt: new Date(`2090-11-${String(day).padStart(2, '0')}T12:00:00Z`), endsAt: new Date(`2090-11-${String(day + 7).padStart(2, '0')}T12:00:00Z`), totalWeeks: 1, configurationVersion: 1 })
    const snapshot: RecurringSourceSnapshot = { games: [], playerPool: [], checkedAt: '2090-11-01T10:00:00Z' }
    beforeAll(async () => { owner = await createTestOwner(db) })
    afterAll(async () => { if (owner) await removeTestOwner(db, owner.user.id); await db.$disconnect() })

    it('concurrent publication creates one league and binding', async () => {
        const repository = new RecurringRepository(db)
        const input = { window: window(2), snapshot, demoTarget: 537, scoringRuleId: owner.rule.id, commissionerId: owner.user.id, mode: 'FUTURE' as const }
        const results = await Promise.all([repository.createIfMissing(input, permit), repository.createIfMissing(input, permit)])
        expect(results.filter(r => r.created)).toHaveLength(1)
        expect(new Set(results.map(r => r.context.leagueId)).size).toBe(1)
        const row = await db.league.findUniqueOrThrow({ where: { id: results[0].context.leagueId }, include: { recurringTournament: true } })
        expect(row).toMatchObject({ leagueSlug: 'winter-leagues', entryFeeCredits: 0, prizePoolCredits: 0, status: 'DRAFTING', totalWeeks: 1 })
        expect(row.recurringTournament?.demoTarget).toBe(537)
        expect(await repository.createIfMissing({ ...input, demoTarget: 900 }, permit)).toMatchObject({ created: false, context: { demoTarget: 537 } })
    })

    it('rolls back the league when metadata cannot be stored', async () => {
        const before = await db.league.count({ where: { commissionerId: owner.user.id } })
        await expect(new RecurringRepository(db).createIfMissing({ window: window(3), snapshot, demoTarget: 2 ** 31, scoringRuleId: owner.rule.id, commissionerId: owner.user.id, mode: 'FUTURE' }, permit)).rejects.toThrow()
        expect(await db.league.count({ where: { commissionerId: owner.user.id } })).toBe(before)
    })

    it('preserves existing weekly lineups and financial history', async () => {
        const old = await db.league.create({ data: { commissionerId: owner.user.id, scoringRuleId: owner.rule.id, inviteCode: `${owner.user.id}-old`, externalSeasonId: 2025, status: 'COMPLETED', draftType: 'AUTO', name: 'Existing championship', leagueSlug: 'mlb', startsAt: new Date('2025-07-01'), endsAt: new Date('2025-07-08'), totalWeeks: 1 } })
        const member = await db.leagueMember.create({ data: { leagueId: old.id, userId: owner.user.id } })
        const lineup = await db.weeklyLineup.create({ data: { leagueMemberId: member.id, week: 1, lockedAt: old.startsAt } })
        const team = await db.fantasyTeam.create({ data: { userId: owner.user.id, leagueMemberId: member.id, name: 'Existing roster', leagueSlug: 'mlb', rosterSlots: { create: { externalPlayerId: 7, playerName: 'Historical pitcher', playerPosition: 'P', playerTeamName: 'Original club', slotPosition: 'P', salaryAtLock: 5000 } } }, include: { rosterSlots: true } })
        const credit = await db.creditTransaction.create({ data: { userId: owner.user.id, type: 'TOURNAMENT_WINNINGS', status: 'COMPLETED', amount: 17, balanceAfter: 17, referenceId: old.id } })
        await new RecurringRepository(db).createIfMissing({ window: window(4), snapshot, demoTarget: 700, scoringRuleId: owner.rule.id, commissionerId: owner.user.id, mode: 'FUTURE' }, permit)
        expect(await db.weeklyLineup.findUnique({ where: { id: lineup.id } })).toEqual(lineup)
        expect(await db.fantasyTeam.findUnique({ where: { id: team.id }, include: { rosterSlots: true } })).toEqual(team)
        expect(await db.creditTransaction.findUnique({ where: { id: credit.id } })).toEqual(credit)
        expect(await db.league.findUnique({ where: { id: old.id } })).toEqual(old)
    })

    it('does not publish a future-mode start whose registration already closed', async () => {
        const past = { ...window(5), startsAt: new Date('2020-11-02T12:00:00Z'), endsAt: new Date('2020-11-09T12:00:00Z') }
        await expect(new RecurringRepository(db).createIfMissing({ window: past, snapshot, demoTarget: 500, scoringRuleId: owner.rule.id, commissionerId: owner.user.id, mode: 'FUTURE' }, permit)).rejects.toThrow('Registration closed')
    })
})
