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
import { chooseDemoLineup, dailyParticipants, demoEntriesDue, demoEntryTarget, demoEntryTime } from './demo-simulation'
import { withShowcaseLease } from './showcase-lease'
import { showcaseLeaseStore } from './showcase-lease.repository'
import { showcaseMutationPermit } from './showcase-mutation-permit'
import { canStartShowcaseBatch, remainingWorkMs, withWorkDeadline, WorkDeadlineError } from './work-deadline'
import { runOfflineFirst } from './showcase-phases'
import { writeDemoBatch } from './demo-batch'

const SCORE_INTERVAL_MS = 15 * 60000
// Daily slates, per-league slates and weekend slates open at the same time; a tick looks at all of them.
const MAX_ENTRY_CONTESTS = 80
// One tick moves each contest forward by at most this many entries, so a big contest cannot use the whole budget.
const ENTRIES_PER_CONTEST_PER_TICK = 200

/** Cron-sized slices of the tick, so each gets its own time budget instead of sharing one. */
export const SHOWCASE_JOBS = ['entries', 'calendar', 'series'] as const
export type ShowcaseJob = (typeof SHOWCASE_JOBS)[number]
type DemoProfileRow = { userId: string; demoKey: string; strategy: string }

/** The cron route's `job` parameter: absent runs every job, an unknown name is rejected with null. */
export function parseShowcaseJobs(value: string | null): readonly ShowcaseJob[] | null {
    if (value === null || value === '') return SHOWCASE_JOBS
    return (SHOWCASE_JOBS as readonly string[]).includes(value) ? [value as ShowcaseJob] : null
}

export async function tickShowcase(db: PrismaClient, { now = new Date(), budgetMs = 50000, jobs = SHOWCASE_JOBS }: { now?: Date; budgetMs?: number; jobs?: readonly ShowcaseJob[] } = {}) {
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
        // Thirty thousand rows are only read when a batch is actually due; a count is enough to size each contest.
        const wantsEntries = jobs.includes('entries')
        const population = wantsEntries ? await db.demoProfile.count() : 0
        let loadedProfiles: DemoProfileRow[] | null = null
        const loadProfiles = async () => loadedProfiles ??= await db.demoProfile.findMany({ select: { userId: true, demoKey: true, strategy: true }, orderBy: [{ datasetSeed: 'asc' }, { ordinal: 'asc' }] })
        const openContests = wantsEntries ? await db.dailyContest.findMany({ where: { mode: 'LIVE', status: { in: ['OPEN', 'LOCKED'] } }, orderBy: { locksAt: 'asc' }, take: MAX_ENTRY_CONTESTS }) : []
        // Every open contest has to fill up, not only the first few to lock: serve the one furthest behind its schedule first.
        const savedOffsets = new Map(await Promise.all(openContests.map(async contest => {
            const key = `showcase:entries:${contest.id}`
            const job = await db.showcaseJob.findUnique({ where: { key } })
            return [key, job?.cursor && typeof job.cursor === 'object' && 'offset' in job.cursor ? Number(job.cursor.offset) : 0] as const
        })))
        const demoTarget = (contest: (typeof openContests)[number]) => demoEntryTarget(contest.contestDate, contest.slateKey, population, (contest.games as unknown[]).length)
        const behind = (contest: (typeof openContests)[number]) => demoEntriesDue(contest, demoTarget(contest), now) - (savedOffsets.get(`showcase:entries:${contest.id}`) ?? 0)
        const notStarted = (contest: (typeof openContests)[number]) => (savedOffsets.get(`showcase:entries:${contest.id}`) ?? 0) === 0
        // A contest with no entries yet goes first, so nothing sits empty while bigger ones catch up.
        const contests = openContests.map(contest => ({ contest, behind: behind(contest) })).sort((a, b) => Number(notStarted(b.contest)) - Number(notStarted(a.contest)) || b.behind - a.behind || a.contest.locksAt.getTime() - b.contest.locksAt.getTime()).map(entry => entry.contest)
        let inserted = 0, scored = 0
        for (const contest of contests) {
            if (!timeLeft()) break
            const jobKey = `showcase:entries:${contest.id}`
            const saved = await db.showcaseJob.findUnique({ where: { key: jobKey } })
            const cursor = saved?.cursor && typeof saved.cursor === 'object' && 'offset' in saved.cursor ? Number(saved.cursor.offset) : 0
            const selection = dailyParticipants(Math.max(1, population), Math.floor(Date.parse(`${contest.contestDate}T00:00:00Z`) / 86400000), demoTarget(contest))
            let offset = cursor
            while (offset < selection.length && offset - cursor < ENTRIES_PER_CONTEST_PER_TICK && timeLeft()) {
                const scheduledAt = demoEntryTime(contest, offset, selection.length)
                if (scheduledAt > now) break
                const end = Math.min(offset + 25, selection.length)
                const rows: { profile: DemoProfileRow; picks: SaveDailyEntryInput; lineup: DailyEntrySlot[]; at: Date }[] = []
                const profiles = await loadProfiles()
                for (let i = offset; i < end; i++) {
                    const at = demoEntryTime(contest, i, selection.length)
                    if (at > now) break
                    const profile = profiles[selection[i]]
                    const picks = chooseDemoLineup(contest.playerPool as unknown as DailyPlayer[], `${profile.demoKey}:${contest.id}`, profile.strategy, profile.demoKey)
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
            if (contest.locksAt <= now && offset >= selection.length && timeLeft()) {
                // A contest waiting on a postponed game stays open for days; re-scoring it every tick would use up the budget.
                const scoreKey = `showcase:scored:${contest.id}`
                const lastScored = await db.showcaseJob.findUnique({ where: { key: scoreKey } })
                const scoredAt = lastScored?.cursor && typeof lastScored.cursor === 'object' && 'at' in lastScored.cursor ? Number(lastScored.cursor.at) : 0
                if (now.getTime() - scoredAt >= SCORE_INTERVAL_MS) {
                    const result = await new DailyScoringService(undefined, db).refreshDailyScores(contest.id, now)
                    scored += result.entriesUpdated
                    await db.showcaseJob.upsert({ where: { key: scoreKey }, create: { key: scoreKey, cursor: { at: now.getTime() } }, update: { cursor: { at: now.getTime() } } })
                }
            }
        }
        return { published, inserted, scored, durationMs: Date.now() - startedAt, timedOut: !timeLeft() }
        }, async () => {
            if (!timeLeft() || !(jobs.includes('calendar') || jobs.includes('series'))) return
        const prior = await db.showcaseJob.findUnique({ where: { key: 'showcase:calendar' } })
        const updatedAt = prior?.cursor && typeof prior.cursor === 'object' && 'at' in prior.cursor ? Number(prior.cursor.at) : 0
        if (jobs.includes('calendar') && process.env.CONTEST_PUBLISHERS_ENABLED === 'true' && now.getTime() - updatedAt > 15 * 60000 && timeLeft()) {
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
        if (jobs.includes('series') && process.env.CONTEST_PUBLISHERS_ENABLED === 'true' && timeLeft()) {
            // Run alone, the fill may use the whole budget; next to other jobs it gets a slice.
            const fillMs = jobs.length === 1 ? budgetMs - 3000 : 15000
            recurringDemoInserted = await fillUpcomingRecurringDemoEntries(db, { now, permit, deadline: Math.min(deadline - 1000, Date.now() + fillMs) })
        }
        })
        return { ...summary, published, recurringPublished, recurringDemoInserted, durationMs: Date.now() - startedAt, timedOut: !timeLeft() }
    })) } catch (error) {
        if (error instanceof WorkDeadlineError || Date.now() >= deadline) return { enabled: true, timedOut: true, durationMs: Date.now() - deadline + budgetMs }
        throw error
    }
}
