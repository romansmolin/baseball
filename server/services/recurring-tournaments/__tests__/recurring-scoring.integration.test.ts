import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { RecurringRepository } from '../../../repositories/recurring-tournaments/recurring.repository'
import { refreshRecurringScores } from '../recurring-scoring.service'
import { createTestDb, createTestOwner, removeTestOwner } from './test-db'
import { FixtureProvider, box, game, pool } from './fixtures'
import type { RecurringGame, RecurringWindow } from '../recurring.types'

describe.skipIf(!process.env.TEST_DATABASE_URL)('recurring scoring persistence', () => {
    const db = process.env.TEST_DATABASE_URL ? createTestDb() : null!
    let owner: Awaited<ReturnType<typeof createTestOwner>>
    const gamePks: number[] = []
    const permit = { assertInTransaction: async () => {} }
    const now = new Date('2026-10-10T12:00:00Z')
    beforeAll(async () => { owner = await createTestOwner(db) })
    afterAll(async () => {
        await db.archivedGameSnapshot.deleteMany({ where: { gamePk: { in: gamePks } } })
        await db.dailyGameSnapshot.deleteMany({ where: { gamePk: { in: gamePks } } })
        if (owner) await removeTestOwner(db, owner.user.id)
        await db.$disconnect()
    })
    async function fixture(id: number) {
        const startsAt = new Date(`2026-10-${String(id).padStart(2, '0')}T12:00:00Z`)
        const window: RecurringWindow = { templateKey: 'weekly-sprint', sourceSlug: 'winter-leagues', startsAt, endsAt: new Date(startsAt.getTime() + 7 * 86400000), totalWeeks: 1, configurationVersion: 1 }
        const scheduled: RecurringGame = { ...game, gamePk: 1905001000 + id, gameDateUtc: new Date(startsAt.getTime() + 86400000).toISOString(), originalStartUtc: new Date(startsAt.getTime() + 86400000).toISOString(), homeTeamName: 'Home', awayTeamName: 'Away', apiSeason: 2026, status: 'FINAL', week: 1 }
        gamePks.push(scheduled.gamePk)
        const { context } = await new RecurringRepository(db).createIfMissing({ window, snapshot: { games: [scheduled], playerPool: pool, checkedAt: startsAt.toISOString() }, demoTarget: 500, scoringRuleId: owner.rule.id, commissionerId: owner.user.id, mode: 'HISTORICAL' }, permit)
        const member = await db.leagueMember.create({ data: { leagueId: context.leagueId, userId: owner.user.id } })
        const slots = ['P', 'C', 'FIRST_BASE', 'SECOND_BASE', 'THIRD_BASE', 'SS', 'OF', 'OF', 'OF'] as const
        const positions = ['P', 'C', 'FIRST_BASE', 'SECOND_BASE', 'THIRD_BASE', 'SS', 'OF', 'OF', 'OF'] as const
        await db.weeklyLineup.create({ data: { leagueMemberId: member.id, week: 1, lockedAt: startsAt, captainExternalPlayerId: 1, slots: { create: pool.map((p, index) => ({ externalPlayerId: p.externalPlayerId, playerName: p.name, playerPosition: positions[index], playerTeamName: p.teamName, slotPosition: slots[index], salaryAtLock: p.salary })) } } })
        const provider = new FixtureProvider()
        provider.games = [{ ...game, gamePk: scheduled.gamePk, gameDateUtc: scheduled.gameDateUtc, status: 'FINAL' }]
        return { context, member, provider, scheduled }
    }
    it('leaves the result preliminary when a final game has no box score', async () => {
        const { context, member, provider } = await fixture(1)
        provider.getBoxScore = async () => null
        const result = await refreshRecurringScores(db, provider, { leagueId: context.leagueId, now, permit, deadline: Date.now() + 10000 })
        expect(result.pendingGames).toBe(1)
        const score = await db.weeklyScoreCache.findUniqueOrThrow({ where: { leagueMemberId_week: { leagueMemberId: member.id, week: 1 } } })
        expect(score.state).toBe('PARTIAL')
        expect((await db.league.findUniqueOrThrow({ where: { id: context.leagueId } })).status).toBe('IN_SEASON')
    })
    it('scores real statistics once, finalizes, and remains idempotent', async () => {
        const { context, member, provider, scheduled } = await fixture(2)
        const result = await refreshRecurringScores(db, provider, { leagueId: context.leagueId, now, permit, deadline: Date.now() + 10000 })
        expect(result.entriesUpdated).toBe(1)
        const score = await db.weeklyScoreCache.findUniqueOrThrow({ where: { leagueMemberId_week: { leagueMemberId: member.id, week: 1 } } })
        expect(score.state).toBe('FINAL')
        expect(Number(score.points)).toBe(67.5)
        expect((await db.league.findUniqueOrThrow({ where: { id: context.leagueId } })).status).toBe('COMPLETED')
        expect((await db.dailyGameSnapshot.findUniqueOrThrow({ where: { gamePk: scheduled.gamePk } })).boxScore).toMatchObject({ ...box, gamePk: scheduled.gamePk })
        await refreshRecurringScores(db, provider, { leagueId: context.leagueId, now, permit, deadline: Date.now() + 10000 })
        expect(provider.boxReads).toBe(1)
        expect(Number((await db.weeklyScoreCache.findUniqueOrThrow({ where: { id: score.id } })).points)).toBe(67.5)
        expect(await db.creditTransaction.count({ where: { userId: owner.user.id } })).toBe(0)
    })
    it('retries a participant after a missing weekly snapshot is restored', async () => {
        const { context, member, provider } = await fixture(3)
        const original = await db.weeklyLineup.findUniqueOrThrow({ where: { leagueMemberId_week: { leagueMemberId: member.id, week: 1 } }, include: { slots: true } })
        await db.weeklyLineup.delete({ where: { id: original.id } })
        await refreshRecurringScores(db, provider, { leagueId: context.leagueId, now, permit, deadline: Date.now() + 10000 })
        expect(await db.weeklyScoreCache.findUnique({ where: { leagueMemberId_week: { leagueMemberId: member.id, week: 1 } } })).toBeNull()
        expect((await db.recurringTournament.findUniqueOrThrow({ where: { leagueId: context.leagueId } })).lastScoredAt).toBeNull()
        expect((await db.league.findUniqueOrThrow({ where: { id: context.leagueId } })).status).toBe('IN_SEASON')
        await db.weeklyLineup.create({ data: { leagueMemberId: member.id, week: 1, lockedAt: original.lockedAt, captainExternalPlayerId: original.captainExternalPlayerId, slots: { create: original.slots.map(s => ({ externalPlayerId: s.externalPlayerId, playerName: s.playerName, playerPosition: s.playerPosition, playerTeamName: s.playerTeamName, playerPhotoUrl: s.playerPhotoUrl, slotPosition: s.slotPosition, salaryAtLock: s.salaryAtLock })) } } })
        await refreshRecurringScores(db, provider, { leagueId: context.leagueId, now, permit, deadline: Date.now() + 10000 })
        expect((await db.weeklyScoreCache.findUniqueOrThrow({ where: { leagueMemberId_week: { leagueMemberId: member.id, week: 1 } } })).state).toBe('FINAL')
    })
    it('refreshes a shared snapshot marked complete despite missing batting data', async () => {
        const { context, member, provider, scheduled } = await fixture(4)
        const afterEnd = new Date('2026-10-12T12:00:00Z')
        await db.dailyGameSnapshot.create({ data: { gamePk: scheduled.gamePk, leagueSlug: 'winter-leagues', status: 'FINAL', complete: true, boxScore: JSON.parse(JSON.stringify({ ...box, gamePk: scheduled.gamePk, batters: [] })), observedAt: new Date(afterEnd.getTime() - 16 * 60000) } })
        await refreshRecurringScores(db, provider, { leagueId: context.leagueId, now: afterEnd, permit, deadline: Date.now() + 10000 })
        expect(provider.boxReads).toBe(1)
        expect((await db.weeklyScoreCache.findUniqueOrThrow({ where: { leagueMemberId_week: { leagueMemberId: member.id, week: 1 } } })).state).toBe('FINAL')
    })
    it('backs off after an incomplete shared snapshot cannot be refreshed', async () => {
        const { context, provider, scheduled } = await fixture(8)
        const afterEnd = new Date('2026-10-17T12:00:00Z')
        await db.dailyGameSnapshot.create({ data: { gamePk: scheduled.gamePk, leagueSlug: 'winter-leagues', status: 'FINAL', complete: true, boxScore: JSON.parse(JSON.stringify({ ...box, gamePk: scheduled.gamePk, batters: [] })), observedAt: new Date(afterEnd.getTime() - 16 * 60000) } })
        provider.getBoxScore = async () => { provider.boxReads++; return null }
        await refreshRecurringScores(db, provider, { leagueId: context.leagueId, now: afterEnd, permit, deadline: Date.now() + 10000 })
        await refreshRecurringScores(db, provider, { leagueId: context.leagueId, now: new Date(afterEnd.getTime() + 60000), permit, deadline: Date.now() + 10000 })
        expect(provider.boxReads).toBe(1)
        expect((await db.dailyGameSnapshot.findUniqueOrThrow({ where: { gamePk: scheduled.gamePk } })).complete).toBe(false)
    })
    it('cancels a tournament whose only game was cancelled', async () => {
        const { context, member, provider } = await fixture(9)
        provider.games = provider.games.map(row => ({ ...row, status: 'CANCELLED' }))
        await refreshRecurringScores(db, provider, { leagueId: context.leagueId, now: new Date('2026-10-17T12:00:00Z'), permit, deadline: Date.now() + 10000 })
        expect((await db.league.findUniqueOrThrow({ where: { id: context.leagueId } })).status).toBe('CANCELLED')
        expect((await db.recurringTournament.findUniqueOrThrow({ where: { leagueId: context.leagueId } })).outcome).toBe('VOID')
        expect((await db.weeklyScoreCache.findUniqueOrThrow({ where: { leagueMemberId_week: { leagueMemberId: member.id, week: 1 } } })).breakdown).toMatchObject({ outcome: 'VOID' })
    })
    it('does not finalize an incomplete saved lineup as a zero-point result', async () => {
        const { context, member, provider } = await fixture(10)
        const lineup = await db.weeklyLineup.findUniqueOrThrow({ where: { leagueMemberId_week: { leagueMemberId: member.id, week: 1 } } })
        await db.weeklyLineupSlot.deleteMany({ where: { weeklyLineupId: lineup.id } })
        await refreshRecurringScores(db, provider, { leagueId: context.leagueId, now: new Date('2026-10-18T12:00:00Z'), permit, deadline: Date.now() + 10000 })
        expect(await db.weeklyScoreCache.findUnique({ where: { leagueMemberId_week: { leagueMemberId: member.id, week: 1 } } })).toBeNull()
        expect((await db.league.findUniqueOrThrow({ where: { id: context.leagueId } })).status).toBe('IN_SEASON')
    })
    it('freezes played statistics of a postponed game after the grace period', async () => {
        const { context, member, provider, scheduled } = await fixture(5)
        const second = { ...scheduled, gamePk: scheduled.gamePk + 100, originalStartUtc: new Date(Date.parse(scheduled.originalStartUtc) + 86400000).toISOString(), gameDateUtc: new Date(Date.parse(scheduled.gameDateUtc) + 86400000).toISOString() }
        gamePks.push(second.gamePk)
        await db.recurringTournament.update({ where: { leagueId: context.leagueId }, data: { games: JSON.parse(JSON.stringify([scheduled, second])) } })
        const afterEnd = new Date('2026-10-15T12:00:00Z')
        provider.games = [{ ...game, gamePk: scheduled.gamePk, gameDateUtc: scheduled.gameDateUtc, status: 'POSTPONED' }, { ...game, gamePk: second.gamePk, gameDateUtc: second.gameDateUtc, status: 'LIVE' }]
        provider.getBoxScore = async gamePk => gamePk === scheduled.gamePk
            ? { ...box, gamePk, status: 'POSTPONED', pitchers: [{ ...box.pitchers[0], inningsPitched: 3, win: false }] }
            : { ...box, gamePk, status: 'LIVE' }
        await refreshRecurringScores(db, provider, { leagueId: context.leagueId, now: afterEnd, permit, deadline: Date.now() + 10000 })
        expect((await db.weeklyScoreCache.findUniqueOrThrow({ where: { leagueMemberId_week: { leagueMemberId: member.id, week: 1 } } })).state).toBe('PARTIAL')
        provider.games = provider.games.map(row => ({ ...row, status: 'FINAL' }))
        provider.getBoxScore = async gamePk => ({ ...box, gamePk, status: 'FINAL' })
        await refreshRecurringScores(db, provider, { leagueId: context.leagueId, now: new Date(afterEnd.getTime() + 16 * 60000), permit, deadline: Date.now() + 10000 })
        const final = await db.weeklyScoreCache.findUniqueOrThrow({ where: { leagueMemberId_week: { leagueMemberId: member.id, week: 1 } } })
        expect(final.state).toBe('FINAL')
        expect(Number(final.points)).toBe(114)
    })
    it('fetches a shared game once for two tournaments with 900 entries each', async () => {
        const first = await fixture(6); const second = await fixture(7)
        await db.recurringTournament.update({ where: { leagueId: second.context.leagueId }, data: { games: JSON.parse(JSON.stringify([first.scheduled])) } })
        second.provider.games = first.provider.games
        const userIds = Array.from({ length: 899 }, (_, i) => `${owner.user.id}-load-${i}`)
        await db.user.createMany({ data: userIds.map(id => ({ id, name: 'Load manager', email: `${id}@managers.invalid`, provider: 'demo' })) })
        try {
            for (const tournament of [first, second]) {
                const members = userIds.map((userId, index) => ({ id: `${tournament.context.leagueId}-m${index}`, leagueId: tournament.context.leagueId, userId }))
                await db.leagueMember.createMany({ data: members })
                await db.weeklyLineup.createMany({ data: members.map(member => ({ id: `${member.id}-w1`, leagueMemberId: member.id, week: 1, lockedAt: tournament.context.window.startsAt, captainExternalPlayerId: 1 })) })
                const positions = ['P', 'C', 'FIRST_BASE', 'SECOND_BASE', 'THIRD_BASE', 'SS', 'OF', 'OF', 'OF'] as const
                const slots = members.flatMap(member => pool.map((p, index) => ({ weeklyLineupId: `${member.id}-w1`, externalPlayerId: p.externalPlayerId, playerName: p.name, playerPosition: positions[index], playerTeamName: p.teamName, slotPosition: positions[index], salaryAtLock: p.salary })))
                for (let offset = 0; offset < slots.length; offset += 500) await db.weeklyLineupSlot.createMany({ data: slots.slice(offset, offset + 500) })
            }
            const a = await refreshRecurringScores(db, first.provider, { leagueId: first.context.leagueId, now, permit, deadline: Date.now() + 20000 })
            const b = await refreshRecurringScores(db, second.provider, { leagueId: second.context.leagueId, now, permit, deadline: Date.now() + 20000 })
            expect(a.entriesUpdated).toBe(900)
            expect(b.entriesUpdated).toBe(900)
            expect(first.provider.boxReads).toBe(1)
            expect(second.provider.boxReads).toBe(0)
        } finally {
            await db.league.deleteMany({ where: { id: { in: [first.context.leagueId, second.context.leagueId] } } })
            await db.user.deleteMany({ where: { id: { in: userIds } } })
        }
    }, 30000)
})
