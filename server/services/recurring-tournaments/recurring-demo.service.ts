import type { PrismaClient } from '../../../src/generated/prisma/client'
import { RecurringDemoRepository } from '../../repositories/recurring-tournaments/recurring-demo.repository'
import type { MutationPermit, RecurringTournamentContext } from './recurring.types'
import { planRecurringDemoEntries } from './recurring-demo-plan'

export async function applyDueRecurringDemoEntries(db: PrismaClient, input: { context: RecurringTournamentContext; now: Date; permit: MutationPermit; deadline: number; cohortSeed?: string }): Promise<{ inserted: number; skippedLate: number; done: boolean }> {
    if (process.env.SHOWCASE_ENABLED !== 'true' || Date.now() + 500 >= input.deadline) return { inserted: 0, skippedLate: 0, done: false }
    const repository = new RecurringDemoRepository(db)
    const previous = await db.showcaseJob.findUnique({ where: { key: `recurring:entries:${input.context.leagueId}` }, select: { cursor: true } })
    const initialPlan = previous?.cursor ? [] : planRecurringDemoEntries(input.context, await repository.profiles(input.cohortSeed), 'recurring-v1', input.context.publishedAt)
    const result = { inserted: 0, skippedLate: 0, done: false }
    while (Date.now() + 500 < input.deadline) {
        const batch = await repository.applyBatch({ ...input, initialPlan })
        result.inserted += batch.inserted; result.skippedLate += batch.skippedLate; result.done = batch.done
        if (batch.done || batch.waiting) break
    }
    return result
}
