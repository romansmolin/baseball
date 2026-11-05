import { Prisma, type PrismaClient } from '../../../src/generated/prisma/client'
import type { MutationPermit, RecurringTournamentContext } from '../../services/recurring-tournaments/recurring.types'
import { canonicalRecurringSlots, createRecurringWeeklyDrafts } from '../../services/recurring-tournaments/recurring-entry.service'
import type { ScheduledDemoEntry } from '../../services/recurring-tournaments/recurring-demo-plan'

type StoredPlanEntry = Omit<ScheduledDemoEntry, 'scheduledAt'> & { scheduledAt: string }
interface DemoCursor { plan: StoredPlanEntry[]; offset: number; done: boolean; skippedLate: number; skipReason?: string }
const eligibleUser = { provider: 'demo', role: 'USER', status: 'ACTIVE', passwordHash: null, payments: { none: {} }, accounts: { none: {} }, sessions: { none: {} }, leaguesOwned: { none: {} } } as const

const DEMO_BATCH_SIZE = 10
/** Left for saving the cursor: entries write a lineup per week and can outlast the transaction on a remote database. */
const TRANSACTION_RESERVE_MS = 3000

export class RecurringDemoRepository {
    constructor(private readonly db: PrismaClient) {}
    async profiles(datasetSeed?: string) {
        return this.db.demoProfile.findMany({ where: { ...(datasetSeed ? { datasetSeed } : {}), user: eligibleUser }, select: { userId: true, demoKey: true, strategy: true }, orderBy: [{ datasetSeed: 'asc' }, { ordinal: 'asc' }, { userId: 'asc' }] })
    }

    async applyBatch(input: { context: RecurringTournamentContext; now: Date; permit: MutationPermit; deadline: number; initialPlan: ScheduledDemoEntry[] }): Promise<{ inserted: number; skippedLate: number; done: boolean; waiting: boolean }> {
        const key = `recurring:entries:${input.context.leagueId}`
        const timeout = Math.max(5000, Math.min(10000, input.deadline - Date.now()))
        return this.db.$transaction(async tx => {
            const stopAt = Date.now() + timeout - TRANSACTION_RESERVE_MS
            await input.permit.assertInTransaction(tx)
            await tx.$queryRaw`SELECT id FROM "League" WHERE id=${input.context.leagueId} FOR UPDATE`
            await tx.$queryRaw`SELECT id FROM "RecurringTournament" WHERE "leagueId"=${input.context.leagueId} FOR UPDATE`
            const league = await tx.league.findUnique({ where: { id: input.context.leagueId }, include: { recurringTournament: true } })
            if (!league?.recurringTournament) throw new Error('Recurring tournament not found')
            const previous = await tx.showcaseJob.findUnique({ where: { key } })
            const cursor: DemoCursor = previous?.cursor ? previous.cursor as unknown as DemoCursor : { plan: input.initialPlan.map(row => ({ ...row, scheduledAt: row.scheduledAt.toISOString() })), offset: 0, done: false, skippedLate: 0 }
            if (cursor.done) return { inserted: 0, skippedLate: 0, done: true, waiting: false }
            const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`
            if (input.now >= league.startsAt || clock.now >= league.startsAt || ['COMPLETED', 'CANCELLED', 'ARCHIVED'].includes(league.status)) {
                const skippedLate = cursor.plan.length - cursor.offset
                cursor.offset = cursor.plan.length; cursor.done = true; cursor.skippedLate += skippedLate; cursor.skipReason = 'registration_closed'
                const closed = JSON.parse(JSON.stringify({ ...cursor, plan: [] }))
                await tx.showcaseJob.upsert({ where: { key }, create: { key, cursor: closed }, update: { cursor: closed } })
                return { inserted: 0, skippedLate, done: true, waiting: false }
            }
            const due: StoredPlanEntry[] = []
            while (cursor.offset + due.length < cursor.plan.length && due.length < DEMO_BATCH_SIZE) {
                const next = cursor.plan[cursor.offset + due.length]
                if (Date.parse(next.scheduledAt) > input.now.getTime()) break
                due.push(next)
            }
            if (!due.length && previous && cursor.plan.length > cursor.offset) return { inserted: 0, skippedLate: 0, done: false, waiting: true }
            let inserted = 0
            if (due.length) {
                const ids = due.map(row => row.userId).sort()
                await tx.$queryRaw`SELECT id FROM "User" WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`
                const eligible = new Set((await tx.demoProfile.findMany({ where: { userId: { in: ids }, user: eligibleUser }, select: { userId: true } })).map(row => row.userId))
                const existing = new Set((await tx.leagueMember.findMany({ where: { leagueId: league.id, userId: { in: ids } }, select: { userId: true } })).map(row => row.userId))
                let processed = 0
                for (const row of due) {
                    if (processed > 0 && Date.now() >= stopAt) break
                    processed++
                    if (!eligible.has(row.userId) || existing.has(row.userId)) continue
                    const slots = canonicalRecurringSlots(row.lineup, input.context.snapshot.playerPool)
                    const member = await tx.leagueMember.create({ data: { leagueId: league.id, userId: row.userId } })
                    await tx.fantasyTeam.create({ data: { userId: row.userId, leagueMemberId: member.id, leagueSlug: league.leagueSlug === 'north-america' ? 'mlb' : league.leagueSlug, name: row.teamName, format: 'Tournament', captainExternalPlayerId: row.lineup.captainExternalPlayerId ?? null, rosterSlots: { create: slots } } })
                    await createRecurringWeeklyDrafts(tx, { memberId: member.id, startsAt: league.startsAt, totalWeeks: league.totalWeeks, slots, captain: row.lineup.captainExternalPlayerId ?? null })
                    inserted++
                }
                cursor.offset += processed
            }
            cursor.done = cursor.offset >= cursor.plan.length
            // A finished plan is never read again; keeping it would leave about a megabyte per series.
            const stored = JSON.parse(JSON.stringify(cursor.done ? { ...cursor, plan: [] } : cursor))
            await tx.showcaseJob.upsert({ where: { key }, create: { key, cursor: stored }, update: { cursor: stored } })
            return { inserted, skippedLate: 0, done: cursor.done, waiting: !due.length && !cursor.done }
        }, { maxWait: 1000, timeout })
    }
}
