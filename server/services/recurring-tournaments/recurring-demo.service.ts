import type { PrismaClient } from '../../../src/generated/prisma/client'
import { mapWithConcurrency } from '../../shared/concurrency.utils'
import { isPrismaError } from '../../shared/db/prisma-error.utils'
import { RecurringDemoRepository } from '../../repositories/recurring-tournaments/recurring-demo.repository'
import { RecurringRepository } from '../../repositories/recurring-tournaments/recurring.repository'
import type { MutationPermit, RecurringTournamentContext } from './recurring.types'
import { planRecurringDemoEntries } from './recurring-demo-plan'

/** Time a batch needs on a remote database; starting later would only expire its transaction. */
const BATCH_RESERVE_MS = 4000
const FILL_CONCURRENCY = 4
const FIRST_SAVE_MS = 15000

export async function applyDueRecurringDemoEntries(db: PrismaClient, input: { context: RecurringTournamentContext; now: Date; permit: MutationPermit; deadline: number; cohortSeed?: string }): Promise<{ inserted: number; skippedLate: number; done: boolean }> {
    if (process.env.SHOWCASE_ENABLED !== 'true' || Date.now() + 500 >= input.deadline) return { inserted: 0, skippedLate: 0, done: false }
    const repository = new RecurringDemoRepository(db)
    const previous = await db.showcaseJob.findUnique({ where: { key: `recurring:entries:${input.context.leagueId}` }, select: { cursor: true } })
    const initialPlan = previous?.cursor ? [] : planRecurringDemoEntries(input.context, await repository.profiles(input.cohortSeed), 'recurring-v1', input.context.publishedAt)
    const result = { inserted: 0, skippedLate: 0, done: false }
    // A fresh plan takes seconds to build; give it time to be saved or the next run repeats the work.
    const deadline = initialPlan.length ? Math.max(input.deadline, Date.now() + FIRST_SAVE_MS) : input.deadline
    while (Date.now() + BATCH_RESERVE_MS < deadline) {
        const batch = await repository.applyBatch({ ...input, deadline, initialPlan })
        result.inserted += batch.inserted; result.skippedLate += batch.skippedLate; result.done = batch.done
        if (batch.done || batch.waiting) break
    }
    return result
}

/** Adds the demo entries that have come due, emptiest series first so none is left at zero. */
export async function fillUpcomingRecurringDemoEntries(db: PrismaClient, input: { now: Date; permit: MutationPermit; deadline: number }): Promise<number> {
    const upcoming = await db.recurringTournament.findMany({ where: { startsAt: { gt: input.now } }, select: { leagueId: true, league: { select: { _count: { select: { members: true } } } } } })
    upcoming.sort((a, b) => a.league._count.members - b.league._count.members)
    const repository = new RecurringRepository(db)
    let inserted = 0
    await mapWithConcurrency(upcoming, FILL_CONCURRENCY, async ({ leagueId }) => {
        if (Date.now() + BATCH_RESERVE_MS >= input.deadline) return
        const context = await repository.findByLeagueId(leagueId)
        if (!context) return
        try {
            inserted += (await applyDueRecurringDemoEntries(db, { ...input, context })).inserted
        } catch (error) {
            // An expired transaction rolls back cleanly; the next tick picks the same batch up again.
            if (!isPrismaError(error, 'P2028')) throw error
        }
    })
    return inserted
}
