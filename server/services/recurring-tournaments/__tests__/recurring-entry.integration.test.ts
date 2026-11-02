import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { RecurringRepository } from '../../../repositories/recurring-tournaments/recurring.repository'
import { joinRecurringTournament, saveRecurringLineup } from '../recurring-entry.service'
import { createTestDb, createTestOwner, removeTestOwner } from './test-db'
import { pool } from './fixtures'
import type { RecurringLineupInput, RecurringWindow } from '../recurring.types'
import { LeagueMemberRepository } from '../../../repositories/league-member/league-member.repository'
import { FantasyTeamRepository } from '../../../repositories/fantasy-team/fantasy-team.repository'
import { LeagueRepository } from '../../../repositories/league/league.repository'
import { TournamentsJoinsService } from '../../tournaments/joins/tournaments-joins.service'
import type { PrismaClient } from '../../../../src/generated/prisma/client'

const picks: RecurringLineupInput = { captainExternalPlayerId: 1, players: [
    { slotKey: 'P', externalPlayerId: 1 }, { slotKey: 'C', externalPlayerId: 2 },
    { slotKey: '1B', externalPlayerId: 3 }, { slotKey: '2B', externalPlayerId: 4 },
    { slotKey: '3B', externalPlayerId: 5 }, { slotKey: 'SS', externalPlayerId: 6 },
    { slotKey: 'LF', externalPlayerId: 7 }, { slotKey: 'CF', externalPlayerId: 8 }, { slotKey: 'RF', externalPlayerId: 9 },
] }
const alternative = { ...picks, players: picks.players.map(p => p.slotKey === 'C' ? { ...p, externalPlayerId: 102 } : p) }
const slotPositions = ['P', 'C', 'FIRST_BASE', 'SECOND_BASE', 'THIRD_BASE', 'SS', 'OF', 'OF', 'OF'] as const

describe.skipIf(!process.env.TEST_DATABASE_URL)('recurring entry transactions', () => {
    const db = process.env.TEST_DATABASE_URL ? createTestDb() : null!
    let owner: Awaited<ReturnType<typeof createTestOwner>>
    let day = 2
    beforeAll(async () => { owner = await createTestOwner(db) })
    afterAll(async () => { if (owner) await removeTestOwner(db, owner.user.id); await db.$disconnect() })
    async function fixture(weeks: 1 | 2 | 4 = 2, expensive = false) {
        const startsAt = new Date(Date.UTC(2092, 0, day++, 12))
        const window: RecurringWindow = { templateKey: weeks === 1 ? 'weekly-sprint' : 'diamond-cup', sourceSlug: 'winter-leagues', startsAt, endsAt: new Date(startsAt.getTime() + weeks * 7 * 86400000), totalWeeks: weeks, configurationVersion: 1 }
        const playerPool = [...pool, { ...pool[1], externalPlayerId: 102, name: 'Replacement catcher', salary: expensive ? 50000 : 6000 }]
        const { context } = await new RecurringRepository(db).createIfMissing({ window, snapshot: { games: [], playerPool, checkedAt: new Date().toISOString() }, demoTarget: 500, scoringRuleId: owner.rule.id, commissionerId: owner.user.id, mode: 'FUTURE' }, { assertInTransaction: async () => {} })
        const team = await db.fantasyTeam.create({ data: { userId: owner.user.id, leagueSlug: 'winter-leagues', name: 'My roster', captainExternalPlayerId: 1, rosterSlots: { create: picks.players.map((p, index) => ({ externalPlayerId: p.externalPlayerId, slotPosition: slotPositions[index], playerPosition: 'P', playerName: 'Forged name', playerTeamName: 'Wrong club', salaryAtLock: 1 })) } } })
        return { context, team }
    }
    const join = (leagueId: string, teamId: string) => joinRecurringTournament(db, { userId: owner.user.id, leagueId, teamId })
    const read = (leagueMemberId: string) => db.weeklyLineup.findMany({ where: { leagueMemberId }, include: { slots: { orderBy: { externalPlayerId: 'asc' } } }, orderBy: { week: 'asc' } })

    it('creates all weekly drafts using canonical player metadata and no credit transactions', async () => {
        const { context, team } = await fixture()
        const result = await join(context.leagueId, team.id)
        const lineups = await read(result.leagueMemberId)
        expect(lineups).toHaveLength(2)
        expect(lineups.map(l => l.lockedAt.toISOString())).toEqual([context.window.startsAt.toISOString(), new Date(context.window.startsAt.getTime() + 7 * 86400000).toISOString()])
        expect(lineups.every(l => l.slots.length === 9)).toBe(true)
        expect(lineups[0].slots.find(s => s.externalPlayerId === 2)).toMatchObject({ playerName: 'Player 2', playerPosition: 'C', playerTeamName: 'Original Club', salaryAtLock: 6000 })
        expect(await db.creditTransaction.count({ where: { userId: owner.user.id } })).toBe(0)
    })

    it('updates both future weeks before the tournament starts', async () => {
        const { context, team } = await fixture(); const member = await join(context.leagueId, team.id)
        await saveRecurringLineup(db, { userId: owner.user.id, teamId: team.id, input: alternative })
        expect((await read(member.leagueMemberId)).every(l => l.slots.some(s => s.externalPlayerId === 102))).toBe(true)
    })

    it('leaves the locked first week unchanged while updating the next week', async () => {
        const { context, team } = await fixture(); const member = await join(context.leagueId, team.id)
        const start = new Date(Date.now() - 86400000)
        await db.weeklyLineup.updateMany({ where: { leagueMemberId: member.leagueMemberId, week: 1 }, data: { lockedAt: start } })
        const before = await read(member.leagueMemberId)
        await saveRecurringLineup(db, { userId: owner.user.id, teamId: team.id, input: alternative })
        const after = await read(member.leagueMemberId)
        expect(after[0]).toEqual(before[0])
        expect(after[1].slots.some(s => s.externalPlayerId === 102)).toBe(true)
    })

    it('does not edit a Sprint after its only week locked', async () => {
        const { context, team } = await fixture(1); const member = await join(context.leagueId, team.id)
        await db.weeklyLineup.updateMany({ where: { leagueMemberId: member.leagueMemberId }, data: { lockedAt: new Date(Date.now() - 1000) } })
        await expect(saveRecurringLineup(db, { userId: owner.user.id, teamId: team.id, input: alternative })).rejects.toMatchObject({ statusCode: 409 })
    })

    it('rejects invalid player IDs, positions, duplicates and a captain outside the roster', async () => {
        const { context, team } = await fixture(); await join(context.leagueId, team.id)
        const invalid = [
            { ...picks, players: picks.players.slice(0, 8) },
            { ...picks, players: picks.players.map((p, i) => i === 8 ? { ...p, externalPlayerId: 1 } : p) },
            { ...picks, players: picks.players.map(p => p.slotKey === 'C' ? { ...p, externalPlayerId: 999 } : p) },
            { ...picks, players: picks.players.map(p => p.slotKey === 'C' ? { ...p, externalPlayerId: 1 } : p.slotKey === 'P' ? { ...p, externalPlayerId: 2 } : p) },
            { ...picks, captainExternalPlayerId: 999 },
        ]
        for (const input of invalid) await expect(saveRecurringLineup(db, { userId: owner.user.id, teamId: team.id, input })).rejects.toMatchObject({ statusCode: 400 })
    })

    it('enforces saved prices even when a cheap client salary is supplied', async () => {
        const { context, team } = await fixture(2, true); await join(context.leagueId, team.id)
        const forged = { ...alternative, players: alternative.players.map(p => ({ ...p, salaryAtLock: 1, name: 'Cheap player' })) }
        await expect(saveRecurringLineup(db, { userId: owner.user.id, teamId: team.id, input: forged })).rejects.toMatchObject({ statusCode: 400 })
    })

    it('allows only one concurrent membership and rejects a different viewer', async () => {
        const { context, team } = await fixture()
        const results = await Promise.allSettled([join(context.leagueId, team.id), join(context.leagueId, team.id)])
        expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
        expect(await db.leagueMember.count({ where: { leagueId: context.leagueId } })).toBe(1)
        await expect(saveRecurringLineup(db, { userId: 'another-viewer', teamId: team.id, input: picks })).rejects.toMatchObject({ statusCode: 403 })
    })

    it('does not let a stale legacy join move an already-entered team', async () => {
        const first = await fixture(); const second = await fixture()
        const member = await join(first.context.leagueId, first.team.id)
        await expect(new LeagueMemberRepository(db).createAndLinkTeam({ leagueId: second.context.leagueId, userId: owner.user.id, fantasyTeamId: first.team.id })).rejects.toMatchObject({ statusCode: 409 })
        expect((await db.fantasyTeam.findUniqueOrThrow({ where: { id: first.team.id } })).leagueMemberId).toBe(member.leagueMemberId)
        expect(await db.leagueMember.count({ where: { leagueId: second.context.leagueId } })).toBe(0)
    })

    it('does not let a stale legacy roster write bypass weekly drafts', async () => {
        const { context, team } = await fixture(); await join(context.leagueId, team.id)
        await expect(new FantasyTeamRepository(db).replaceRoster({ teamId: team.id, captainExternalPlayerId: null, rosterSlots: [] })).rejects.toMatchObject({ statusCode: 409 })
        expect(await db.rosterSlot.count({ where: { fantasyTeamId: team.id } })).toBe(9)
    })

    it('preserves late joining for an existing non-recurring tournament', async () => {
        const { team } = await fixture()
        await db.fantasyTeam.update({ where: { id: team.id }, data: { leagueSlug: 'mlb' } })
        const league = await db.league.create({ data: { commissionerId: owner.user.id, scoringRuleId: owner.rule.id, inviteCode: `${team.id}-legacy`, name: 'Legacy live league', leagueSlug: 'mlb', externalSeasonId: 2026, draftType: 'AUTO', status: 'IN_SEASON', startsAt: new Date(Date.now() - 86400000), endsAt: new Date(Date.now() + 13 * 86400000), totalWeeks: 2 } })
        const unused = async () => { throw new Error('Not part of this zero-fee legacy join') }
        const service = new TournamentsJoinsService(new LeagueRepository(db), new LeagueMemberRepository(db), new FantasyTeamRepository(db), { snapshotMemberForWeek: unused, snapshotForJoin: async () => null, snapshotAllForCurrentWeek: unused, backfillMissingWeeks: unused }, { getBalance: unused, getTransactions: unused, grantCredits: unused, existsByReference: unused }, db)
        const result = await service.joinTournament({ userId: owner.user.id, tournamentId: league.id, fantasyTeamId: team.id })
        expect(await db.leagueMember.findUnique({ where: { id: result.leagueMemberId } })).toMatchObject({ leagueId: league.id, userId: owner.user.id })
    })

    it('reads an existing tournament when the recurring migration is unavailable', async () => {
        const league = await db.league.create({ data: { commissionerId: owner.user.id, scoringRuleId: owner.rule.id, inviteCode: `${owner.user.id}-pre-migration`, name: 'Before migration', leagueSlug: 'mlb', externalSeasonId: 2026, draftType: 'AUTO', status: 'IN_SEASON', startsAt: new Date('2026-01-01'), endsAt: new Date('2026-01-08'), totalWeeks: 1 } })
        const record = await db.$transaction(async tx => {
            await tx.$executeRaw`SET LOCAL search_path TO pg_catalog`
            return new LeagueRepository(tx as unknown as PrismaClient).findById(league.id)
        })
        expect(record).toMatchObject({ id: league.id, name: 'Before migration' })
        expect(record?.recurringTournament).toBeUndefined()
    })

    it('rechecks the database clock after a concurrent lock held past registration', async () => {
        const { context, team } = await fixture(1)
        let unlock!: () => void; let ready!: () => void
        const release = new Promise<void>(resolve => { unlock = resolve })
        const acquired = new Promise<void>(resolve => { ready = resolve })
        const blocker = db.$transaction(async tx => {
            await tx.$queryRaw`SELECT id FROM "League" WHERE id=${context.leagueId} FOR UPDATE`
            const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`
            const start = new Date(clock.now.getTime() + 250)
            await tx.league.update({ where: { id: context.leagueId }, data: { startsAt: start } })
            await tx.recurringTournament.update({ where: { leagueId: context.leagueId }, data: { startsAt: start } })
            ready(); await release
        }, { timeout: 5000 })
        await acquired
        const assertion = expect(join(context.leagueId, team.id)).rejects.toMatchObject({ statusCode: 409 })
        await new Promise(resolve => setTimeout(resolve, 400)); unlock(); await blocker; await assertion
        expect(await db.leagueMember.count({ where: { leagueId: context.leagueId } })).toBe(0)
    })

    it('updates only the next week when a pending edit waits past the first boundary', async () => {
        const { context, team } = await fixture(); const member = await join(context.leagueId, team.id)
        let unlock!: () => void; let ready!: () => void
        const release = new Promise<void>(resolve => { unlock = resolve })
        const acquired = new Promise<void>(resolve => { ready = resolve })
        let firstBefore: Awaited<ReturnType<typeof read>>[number]
        const blocker = db.$transaction(async tx => {
            await tx.$queryRaw`SELECT id FROM "League" WHERE id=${context.leagueId} FOR UPDATE`
            const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`
            firstBefore = await tx.weeklyLineup.update({ where: { leagueMemberId_week: { leagueMemberId: member.leagueMemberId, week: 1 } }, data: { lockedAt: new Date(clock.now.getTime() + 250) }, include: { slots: { orderBy: { externalPlayerId: 'asc' } } } })
            ready(); await release
        }, { timeout: 5000 })
        await acquired
        const saving = saveRecurringLineup(db, { userId: owner.user.id, teamId: team.id, input: alternative })
        await new Promise(resolve => setTimeout(resolve, 400)); unlock(); await blocker; await saving
        const after = await read(member.leagueMemberId)
        expect(after[0]).toEqual(firstBefore!)
        expect(after[1].slots.some(s => s.externalPlayerId === 102)).toBe(true)
    })
})
