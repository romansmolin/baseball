import type { PrismaClient, Prisma } from '../../../src/generated/prisma/client'
import { dailyContestName } from '../daily-contests/daily-contest-names'
import type { DailyPlayer } from '@/shared/daily-contests'
import { DailyCalendarService } from '../daily-contests/daily-calendar.service'
import { parseScoringRule } from '../scoring/scoring-rule.schema'
import { canPublishPool, scoreDailyLineup, validateDailyLineup } from '../daily-contests/daily-rules'
import { chooseDemoLineup, dailyParticipants } from './demo-simulation'
import { refreshManagerStandings } from '../community/manager-standings.service'
import { prepareReplayArchive } from './replay-archive'

const json = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value))
export async function seedShowcaseHistory(db: PrismaClient, input: { days: number; participantsPerDay: number; seed: string; dryRun: boolean; now?: Date }, loadArchive = prepareReplayArchive) {
    const now = input.now ?? new Date()
    if (!Number.isInteger(input.days) || input.days < 1 || input.days > 30 || !Number.isInteger(input.participantsPerDay) || input.participantsPerDay < 1) throw new Error('Invalid history size')
    const profiles = await db.demoProfile.findMany({ where: { datasetSeed: input.seed }, orderBy: { ordinal: 'asc' } })
    if (!profiles.length) throw new Error('Import demo profiles before history')
    const ruleRow = await db.scoringRule.findFirst({ where: { isDefault: true } })
    if (!ruleRow) throw new Error('Default baseball scoring rule is required')
    const rule = parseScoringRule(ruleRow.rules)
    if (input.dryRun) return { days: input.days, profiles: profiles.length, entries: input.days * Math.min(profiles.length, input.participantsPerDay), dryRun: true }
    const calendar = new DailyCalendarService(undefined, db)
    const archives = await loadArchive(calendar, input.days)
    let entriesCreated = 0
    for (let day = 0; day < input.days; day++) {
        const archive = archives[day]
        const sourceDate = archive.sourceDate
        const contestDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - input.days + day)).toISOString().slice(0, 10)
        const key = { mode: 'REPLAY' as const, leagueSlug: 'mlb', contestDate, slateKey: 'classic' }
        const previous = await db.dailyContest.findUnique({ where: { mode_leagueSlug_contestDate_slateKey: key }, include: { _count: { select: { entries: true } } } })
        if (previous?.status === 'COMPLETED' && previous._count.entries >= Math.min(profiles.length, input.participantsPerDay)) continue
        if (!archive.games.length || !canPublishPool(archive.players, 80000)) throw new Error(`Archive ${sourceDate} cannot support a complete contest`)
        const locksAt = new Date(`${contestDate}T19:00:00Z`)
        for (const box of archive.boxScores) await db.dailyGameSnapshot.upsert({ where: { gamePk: box.gamePk }, create: { gamePk: box.gamePk, leagueSlug: 'mlb', status: box.status, boxScore: json(box), complete: true }, update: {} })
        const contest = await db.dailyContest.upsert({ where: { mode_leagueSlug_contestDate_slateKey: key }, create: { ...key, name: dailyContestName('mlb', contestDate), sourceDate, locksAt, games: json(archive.games), playerPool: json(archive.players), scoringRule: json(rule), createdAt: new Date(`${contestDate}T00:00:00Z`) }, update: {} })
        const selected = dailyParticipants(profiles.length, day, input.participantsPerDay)
        for (let batchStart = 0; batchStart < selected.length; batchStart += 500) {
            const rows = selected.slice(batchStart, batchStart + 500).map((index, n) => {
                const profile = profiles[index]
                const picks = chooseDemoLineup(archive.players, `${profile.demoKey}:${sourceDate}`, profile.strategy, profile.demoKey)
                const slots = validateDailyLineup(picks, archive.players as DailyPlayer[], 80000)
                const score = scoreDailyLineup(slots, picks.captainExternalPlayerId ?? null, archive.boxScores, rule, 1.5)
                const createdAt = new Date(locksAt.getTime() - 3600000 - ((batchStart + n) % 180) * 60000)
                return { profile, picks, score, createdAt }
            })
            const createdCount = await db.$transaction(async tx => {
                const created = await tx.dailyEntry.createManyAndReturn({ data: rows.map(row => ({ contestId: contest.id, userId: row.profile.userId, teamName: row.picks.teamName, captainExternalPlayerId: row.picks.captainExternalPlayerId, lineup: json(row.score.slots), points: row.score.points, isFinal: true, createdAt: row.createdAt })), skipDuplicates: true, select: { id: true } })
                const entries = await tx.dailyEntry.findMany({ where: { contestId: contest.id, userId: { in: rows.map(row => row.profile.userId) } }, select: { id: true, userId: true } })
                const byUser = new Map(entries.map(entry => [entry.userId, entry.id]))
                const events = rows.flatMap(row => {
                    const entryId = byUser.get(row.profile.userId)
                    if (!entryId) throw new Error('Unable to resolve imported daily entry')
                    return ([['ENTRY_JOINED', row.createdAt], ['LINEUP_LOCKED', locksAt]] as const).map(([kind, at]) => ({ sourceKey: `${kind.toLowerCase()}:${entryId}`, kind, userId: row.profile.userId, contestId: contest.id, occurredAt: at, payload: { detail: kind === 'ENTRY_JOINED' ? `Joined ${contest.name}` : 'Daily lineup locked' } }))
                })
                await tx.communityEvent.createMany({ data: events, skipDuplicates: true })
                return created.length
            }, { timeout: 60000 })
            entriesCreated += createdCount
        }
        await db.$transaction([
            db.dailyContest.update({ where: { id: contest.id }, data: { status: 'COMPLETED' } }),
            db.communityEvent.upsert({ where: { sourceKey: `completed:${contest.id}` }, create: { sourceKey: `completed:${contest.id}`, kind: 'CONTEST_COMPLETED', contestId: contest.id, occurredAt: new Date(locksAt.getTime() + 300000), payload: { detail: `${contest.name} results are final` } }, update: {} }),
        ])
    }
    await refreshManagerStandings('REPLAY', now, db)
    return { days: input.days, profiles: profiles.length, entries: entriesCreated, dryRun: false }
}
