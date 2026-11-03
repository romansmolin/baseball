import type { Prisma, PrismaClient } from '../../../src/generated/prisma/client'
import type { DailyPlayer, DailyEntrySlot, SaveDailyEntryInput } from '@/shared/daily-contests'
import { DailyCalendarService } from '../daily-contests/daily-calendar.service'
import { DailyScoringService } from '../daily-contests/daily-scoring.service'
import { validateDailyLineup } from '../daily-contests/daily-rules'
import { getSportsProvider } from '../../providers/sports-provider.factory'
import { publishRecurringTournaments } from '../recurring-tournaments/recurring-publisher.service'
import { recurringHorizonDays, recurringSources } from '../recurring-tournaments/recurring-calendar'
import { fillUpcomingRecurringDemoEntries } from '../recurring-tournaments/recurring-demo.service'
import type { SourceCheckpoint } from '../recurring-tournaments/recurring-source.service'
import { chooseDemoLineup, dailyParticipants } from './demo-simulation'
import { withShowcaseLease } from './showcase-lease'
import { showcaseLeaseStore } from './showcase-lease.repository'
import { showcaseMutationPermit } from './showcase-mutation-permit'
import { canStartShowcaseBatch, remainingWorkMs, withWorkDeadline, WorkDeadlineError } from './work-deadline'
import { runOfflineFirst } from './showcase-phases'
import { writeDemoBatch } from './demo-batch'

export async function tickShowcase(db: PrismaClient, { now = new Date(), budgetMs = 50000 }: { now?: Date; budgetMs?: number } = {}) {
    if (process.env.SHOWCASE_ENABLED !== 'true') return { enabled: false, acquired: false }
    if (!Number.isFinite(budgetMs) || budgetMs < 1000 || budgetMs > 50000) throw new Error('Showcase budget must be between 1000 and 50000ms')
    const deadline = Date.now() + budgetMs
    try { return await withWorkDeadline(deadline, () => withShowcaseLease(showcaseLeaseStore(db), 'showcase:tick', now, async leaseToken => {
        const startedAt = Date.now()
        const timeLeft = canStartShowcaseBatch
        const permit = showcaseMutationPermit('showcase:tick', leaseToken)
        let published = 0
        let recurringPublished = 0
        let recurringDemoInserted = 0
        const summary = await runOfflineFirst(async () => {
        const profiles = await db.demoProfile.findMany({ orderBy: [{ datasetSeed: 'asc' }, { ordinal: 'asc' }] })
        const contests = await db.dailyContest.findMany({ where: { mode: 'LIVE', status: { in: ['OPEN', 'LOCKED'] } }, orderBy: { locksAt: 'asc' }, take: 20 })
        let inserted = 0, scored = 0
        for (const contest of contests) {
            if (!timeLeft()) break
            const jobKey = `showcase:entries:${contest.id}`
            const saved = await db.showcaseJob.findUnique({ where: { key: jobKey } })
            const cursor = saved?.cursor && typeof saved.cursor === 'object' && 'offset' in saved.cursor ? Number(saved.cursor.offset) : 0
            const selection = dailyParticipants(Math.max(1, profiles.length), Math.floor(Date.parse(`${contest.contestDate}T00:00:00Z`) / 86400000), Math.min(1500, profiles.length))
            let offset = cursor
            while (offset < selection.length && timeLeft()) {
                const scheduledAt = new Date(contest.locksAt.getTime() - 12 * 3600000 + offset / selection.length * 12 * 3600000)
                if (scheduledAt > now) break
                const end = Math.min(offset + 25, selection.length)
                const rows: { profile: (typeof profiles)[number]; picks: SaveDailyEntryInput; lineup: DailyEntrySlot[]; at: Date }[] = []
                for (let i = offset; i < end; i++) {
                    const at = new Date(contest.locksAt.getTime() - 12 * 3600000 + i / selection.length * 12 * 3600000)
                    if (at > now) break
                    const profile = profiles[selection[i]]
                    const picks = chooseDemoLineup(contest.playerPool as unknown as DailyPlayer[], `${profile.demoKey}:${contest.id}`, profile.strategy)
                    const lineup = validateDailyLineup(picks, contest.playerPool as unknown as DailyPlayer[], contest.salaryCap)
                    rows.push({ profile, picks, lineup, at })
                }
                if (!rows.length) break
                await db.$transaction(async tx => {
                    await writeDemoBatch(tx, contest, rows)
                    await tx.showcaseJob.upsert({ where: { key: jobKey }, create: { key: jobKey, cursor: { offset: offset + rows.length } }, update: { cursor: { offset: offset + rows.length } } })
                }, { timeout: Math.max(1, Math.min(10000, remainingWorkMs() - 500)), maxWait: Math.max(1, Math.min(1000, remainingWorkMs() - 500)) })
                offset += rows.length
                inserted += rows.length
            }
            if (contest.locksAt <= now && offset === selection.length && timeLeft()) {
                const result = await new DailyScoringService(undefined, db).refreshDailyScores(contest.id, now)
                scored += result.entriesUpdated
            }
        }
        return { published, inserted, scored, durationMs: Date.now() - startedAt, timedOut: !timeLeft() }
        }, async () => {
            if (!timeLeft()) return
        const prior = await db.showcaseJob.findUnique({ where: { key: 'showcase:calendar' } })
        const updatedAt = prior?.cursor && typeof prior.cursor === 'object' && 'at' in prior.cursor ? Number(prior.cursor.at) : 0
        if (process.env.CONTEST_PUBLISHERS_ENABLED === 'true' && now.getTime() - updatedAt > 15 * 60000 && timeLeft()) {
            // Record the attempt before upstream I/O, so a failed provider has
            // a backoff as well as a successful refresh.
            await db.showcaseJob.upsert({ where: { key: 'showcase:calendar' }, create: { key: 'showcase:calendar', cursor: { at: now.getTime() } }, update: { cursor: { at: now.getTime() } } })
            const errors: Error[] = []
            try {
                const dailyDeadline = Math.min(deadline - 5000, Date.now() + 25000)
                const result = await withWorkDeadline(dailyDeadline, () => new DailyCalendarService(undefined, db).publishDailyContests({ now }))
                published = result.published
            } catch (error) {
                errors.push(error instanceof Error ? error : new Error('Daily contest publication failed'))
            }

            const recurringJob = await db.showcaseJob.findUnique({ where: { key: 'showcase:recurring-publisher' } })
            const recurringCursor = recurringJob?.cursor && typeof recurringJob.cursor === 'object'
                ? recurringJob.cursor as { checkpoint?: SourceCheckpoint }
                : undefined
            try {
                if (timeLeft()) {
                    const recurringDeadline = Math.min(deadline - 3000, Date.now() + 20000)
                    const result = await withWorkDeadline(recurringDeadline, () => publishRecurringTournaments(db, getSportsProvider(), {
                        now,
                        horizonDays: recurringHorizonDays(process.env),
                        sources: recurringSources(process.env),
                        deadline: recurringDeadline,
                        checkpoint: recurringCursor?.checkpoint,
                        dryRun: false,
                        permit,
                    }))
                recurringPublished = result.created
                const cursor = JSON.parse(JSON.stringify({ checkpoint: result.checkpoint ?? null, at: now.getTime() })) as Prisma.InputJsonValue
                await db.showcaseJob.upsert({
                    where: { key: 'showcase:recurring-publisher' },
                    create: { key: 'showcase:recurring-publisher', cursor },
                    update: { cursor },
                })
                }
            } catch (error) {
                errors.push(error instanceof Error ? error : new Error('Recurring contest publication failed'))
            }
            if (errors.length) throw new AggregateError(errors, 'Contest calendar update failed')
            await db.showcaseJob.upsert({ where: { key: 'showcase:calendar' }, create: { key: 'showcase:calendar', cursor: { at: now.getTime() } }, update: { cursor: { at: now.getTime() } } })
        }
        if (process.env.CONTEST_PUBLISHERS_ENABLED === 'true' && timeLeft()) {
            recurringDemoInserted = await fillUpcomingRecurringDemoEntries(db, { now, permit, deadline: Math.min(deadline - 1000, Date.now() + 15000) })
        }
        })
        return { ...summary, published, recurringPublished, recurringDemoInserted, durationMs: Date.now() - startedAt, timedOut: !timeLeft() }
    })) } catch (error) {
        if (error instanceof WorkDeadlineError || Date.now() >= deadline) return { enabled: true, timedOut: true, durationMs: Date.now() - deadline + budgetMs }
        throw error
    }
}
