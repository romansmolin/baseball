import type { PrismaClient, Prisma } from '../../../src/generated/prisma/client'
import type { DailyPlayer, DailyEntrySlot, SaveDailyEntryInput } from '@/shared/daily-contests'
import { DailyCalendarService } from '../daily-contests/daily-calendar.service'
import { DailyScoringService } from '../daily-contests/daily-scoring.service'
import { validateDailyLineup } from '../daily-contests/daily-rules'
import { chooseDemoLineup, dailyParticipants } from './demo-simulation'
import { withShowcaseLease } from './showcase-lease'
import { showcaseLeaseStore } from './showcase-lease.repository'
import { assertWorkTime, remainingWorkMs, withWorkDeadline, WorkDeadlineError } from './work-deadline'
import { runOfflineFirst } from './showcase-phases'

const json = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value))
export async function tickShowcase(db: PrismaClient, { now = new Date(), budgetMs = 20000 }: { now?: Date; budgetMs?: number } = {}) {
    if (process.env.SHOWCASE_ENABLED !== 'true') return { enabled: false, acquired: false }
    if (!Number.isFinite(budgetMs) || budgetMs < 1000 || budgetMs > 20000) throw new Error('Showcase budget must be between 1000 and 20000ms')
    const deadline = Date.now() + budgetMs
    try { return await withWorkDeadline(deadline, () => withShowcaseLease(showcaseLeaseStore(db), 'showcase:tick', now, async () => {
        const startedAt = Date.now()
        const timeLeft = () => remainingWorkMs() > 1000
        let published = 0
        const summary = await runOfflineFirst(async () => {
        const templates = await db.dailyContest.findMany({ where: { mode: 'REPLAY', status: 'COMPLETED' }, orderBy: { contestDate: 'desc' }, take: 30 })
        for (let d = 0; templates.length && d < 3 && timeLeft(); d++) {
            const date = new Date(now.getTime() + d * 86400000).toISOString().slice(0, 10)
            const source = templates[(Math.floor(now.getTime() / 86400000) + d) % templates.length]
            const key = { mode: 'REPLAY' as const, leagueSlug: source.leagueSlug, contestDate: date, slateKey: 'classic' }
            await db.dailyContest.upsert({ where: { mode_leagueSlug_contestDate_slateKey: key }, create: { ...key, name: 'MLB Replay Classic', sourceDate: source.sourceDate, locksAt: new Date(`${date}T19:00:00Z`), games: source.games as Prisma.InputJsonValue, playerPool: source.playerPool as Prisma.InputJsonValue, scoringRule: source.scoringRule as Prisma.InputJsonValue }, update: {} })
        }
        const profiles = await db.demoProfile.findMany({ orderBy: [{ datasetSeed: 'asc' }, { ordinal: 'asc' }] })
        const contests = await db.dailyContest.findMany({ where: { status: { in: ['OPEN', 'LOCKED'] } }, orderBy: { locksAt: 'asc' }, take: 20 })
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
                    for (const row of rows) {
                        assertWorkTime(500)
                        const entry = await tx.dailyEntry.upsert({ where: { contestId_userId: { contestId: contest.id, userId: row.profile.userId } }, create: { contestId: contest.id, userId: row.profile.userId, teamName: row.picks.teamName, captainExternalPlayerId: row.picks.captainExternalPlayerId, lineup: json(row.lineup), createdAt: row.at }, update: {} })
                        const sourceKey = `entry_joined:${entry.id}`
                        await tx.communityEvent.upsert({ where: { sourceKey }, create: { sourceKey, kind: 'ENTRY_JOINED', userId: row.profile.userId, contestId: contest.id, occurredAt: row.at, payload: { detail: `Joined ${contest.name}` } }, update: {} })
                    }
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
        if (now.getTime() - updatedAt > 15 * 60000 && timeLeft()) {
            // Record the attempt before upstream I/O, so a failed provider has
            // a backoff as well as a successful refresh.
            await db.showcaseJob.upsert({ where: { key: 'showcase:calendar' }, create: { key: 'showcase:calendar', cursor: { at: now.getTime() } }, update: { cursor: { at: now.getTime() } } })
            const result = await new DailyCalendarService(undefined, db).publishDailyContests({ now, lookaheadDays: 3 })
            assertWorkTime(1000)
            published = result.published
            await db.showcaseJob.upsert({ where: { key: 'showcase:calendar' }, create: { key: 'showcase:calendar', cursor: { at: now.getTime() } }, update: { cursor: { at: now.getTime() } } })
        }
        })
        return { ...summary, published, durationMs: Date.now() - startedAt, timedOut: !timeLeft() }
    })) } catch (error) {
        if (error instanceof WorkDeadlineError || Date.now() >= deadline) return { enabled: true, timedOut: true, durationMs: Date.now() - deadline + budgetMs }
        throw error
    }
}
