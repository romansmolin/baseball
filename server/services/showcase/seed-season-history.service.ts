import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Prisma, PrismaClient } from '../../../src/generated/prisma/client'
import type { DailyPlayer } from '@/shared/daily-contests'
import { MlbSportsProvider } from '../../providers/mlb/mlb.provider'
import type { ISportsProvider } from '../../providers/sports-provider.interface'
import { DailyCalendarService } from '../daily-contests/daily-calendar.service'
import { canPublishPool, dailyDate, scoreDailyLineup, validateDailyLineup } from '../daily-contests/daily-rules'
import { parseScoringRule } from '../scoring/scoring-rule.schema'
import { refreshManagerStandings } from '../community/manager-standings.service'
import { chooseDemoLineup } from './demo-simulation'

const json = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value))
const MAX_SEASON_DAYS = 180
const MAX_PLANNED_ENTRIES = 300000

export interface SeedSeasonHistoryInput {
    season: number
    days: number
    participantsPerDay: number
    seed: string
    dryRun: boolean
    now?: Date
}

interface SeasonReplayDay {
    sourceDate: string
    games: Awaited<ReturnType<DailyCalendarService['loadReplayDay']>>['games']
    players: DailyPlayer[]
    boxScores: Awaited<ReturnType<DailyCalendarService['loadReplayDay']>>['boxScores']
}

interface PlannedEntry {
    userId: string
    picks: ReturnType<typeof chooseDemoLineup>
    lineup: ReturnType<typeof validateDailyLineup>
    points: number
    createdAt: Date
}

function monthRange(season: number, month: number, through: string) {
    const firstDate = `${season}-${String(month + 1).padStart(2, '0')}-01`
    const lastDay = new Date(Date.UTC(season, month + 1, 0)).getUTCDate()
    const lastDate = `${season}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    return { firstDate, lastDate: lastDate > through ? through : lastDate }
}

async function findCompletedGameDates(provider: ISportsProvider, season: number, through: string): Promise<string[]> {
    const dates = new Set<string>()
    for (let month = 0; month < 12; month++) {
        const range = monthRange(season, month, through)
        if (range.firstDate > through) break
        const games = await provider.getSchedule({
            startDateUtc: new Date(`${range.firstDate}T00:00:00.000Z`),
            endDateUtc: new Date(`${range.lastDate}T23:59:59.999Z`),
            season,
            league: 'mlb',
            revalidateSeconds: 3600,
        })
        for (const game of games) {
            if (game.status === 'FINAL') dates.add(dailyDate(new Date(game.gameDateUtc)))
        }
    }
    return [...dates].sort((a, b) => b.localeCompare(a))
}

function assertPlayableDay(day: SeasonReplayDay, sourceDate: string): boolean {
    return day.sourceDate === sourceDate
        && day.games.length > 0
        && day.games.every(game => game.status === 'FINAL')
        && day.boxScores.length === day.games.length
        && day.boxScores.every(box => box.status === 'FINAL' && (box.batters.length > 0 || box.pitchers.length > 0))
        && canPublishPool(day.players, 80000)
}

async function loadSeasonDay(calendar: DailyCalendarService, season: number, sourceDate: string, cacheDirectory: string): Promise<SeasonReplayDay | null> {
    const path = join(cacheDirectory, `${sourceDate}.json`)
    let day: SeasonReplayDay
    try {
        day = JSON.parse(await readFile(path, 'utf8')) as SeasonReplayDay
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
        try {
            day = await calendar.loadReplayDay({ season, sourceDate })
        } catch (loadError) {
            if (loadError instanceof Error && loadError.message.startsWith('Incomplete archive game')) return null
            throw loadError
        }
        if (!assertPlayableDay(day, sourceDate)) return null
        await writeFile(`${path}.tmp`, JSON.stringify(day), { mode: 0o600 })
        await rename(`${path}.tmp`, path)
    }
    if (!assertPlayableDay(day, sourceDate)) throw new Error(`Invalid cached replay day ${sourceDate}`)
    return day
}

function selectParticipants(population: number, dayIndex: number, days: number, requestedCount: number): number[] {
    const minimumForCoverage = Math.ceil(population / days)
    if (requestedCount < minimumForCoverage) {
        throw new Error(`--participants must be at least ${minimumForCoverage} to give every demo profile an entry across ${days} game days`)
    }
    const count = Math.min(population, requestedCount)
    const start = (dayIndex * minimumForCoverage) % population
    return Array.from({ length: count }, (_, index) => (start + index) % population)
}

async function loadSeasonDays(calendar: DailyCalendarService, provider: ISportsProvider, season: number, count: number, through: string): Promise<SeasonReplayDay[]> {
    const cacheDirectory = join(process.cwd(), '.showcase-data', `archive-${season}-season`)
    await mkdir(cacheDirectory, { recursive: true })
    const candidateDates = await findCompletedGameDates(provider, season, through)
    const days: SeasonReplayDay[] = []
    for (const date of candidateDates) {
        const day = await loadSeasonDay(calendar, season, date, cacheDirectory)
        if (day) days.push(day)
        if (days.length === count) return days.reverse()
    }
    throw new Error(`Only ${days.length} verified game days found in season ${season}; ${count} required`)
}

export async function seedSeasonHistory(
    db: PrismaClient,
    input: SeedSeasonHistoryInput,
    provider: ISportsProvider = new MlbSportsProvider(),
) {
    const now = input.now ?? new Date()
    const currentDate = dailyDate(now)
    if (!Number.isInteger(input.season) || input.season < 1876 || input.season > Number(currentDate.slice(0, 4))) throw new Error('--season must be a valid current or past MLB season')
    if (!Number.isInteger(input.days) || input.days < 1 || input.days > MAX_SEASON_DAYS) throw new Error(`--days must be 1..${MAX_SEASON_DAYS}`)
    if (!Number.isInteger(input.participantsPerDay) || input.participantsPerDay < 1) throw new Error('--participants must be a positive integer')

    const profiles = await db.demoProfile.findMany({
        where: { datasetSeed: input.seed, user: { status: 'ACTIVE' } },
        orderBy: { ordinal: 'asc' },
        select: { userId: true, demoKey: true, strategy: true },
    })
    if (!profiles.length) throw new Error('Import active demo profiles before seeding season history')

    const ruleRow = await db.scoringRule.findFirst({ where: { isDefault: true } })
    if (!ruleRow) throw new Error('Default baseball scoring rule is required')
    const rule = parseScoringRule(ruleRow.rules)
    if (input.days * Math.min(profiles.length, input.participantsPerDay) > MAX_PLANNED_ENTRIES) {
        throw new Error(`The requested import exceeds ${MAX_PLANNED_ENTRIES} entries; reduce --days or --participants`)
    }
    const calendar = new DailyCalendarService(provider, db)
    const days = await loadSeasonDays(calendar, provider, input.season, input.days, currentDate)

    const plans = days.map((day, dayIndex) => {
        const selected = selectParticipants(profiles.length, dayIndex, days.length, input.participantsPerDay)
        const locksAt = new Date(Math.min(...day.games.map(game => Date.parse(game.gameDateUtc))))
        const entries = selected.map((profileIndex, entryIndex): PlannedEntry => {
            const profile = profiles[profileIndex]
            const picks = chooseDemoLineup(day.players, `${profile.demoKey}:${input.season}:${day.sourceDate}`, profile.strategy)
            const lineup = validateDailyLineup(picks, day.players, 80000)
            const scored = scoreDailyLineup(lineup, picks.captainExternalPlayerId ?? null, day.boxScores, rule, 1.5)
            return {
                userId: profile.userId,
                picks,
                lineup: scored.slots,
                points: scored.points,
                createdAt: new Date(locksAt.getTime() - 12 * 3600000 + entryIndex / selected.length * 12 * 3600000),
            }
        })
        return { day, locksAt, entries }
    })
    const coveredUsers = new Set(plans.flatMap(plan => plan.entries.map(entry => entry.userId))).size
    const entriesPlanned = plans.reduce((sum, plan) => sum + plan.entries.length, 0)
    if (coveredUsers !== profiles.length) throw new Error(`Season rotation would cover ${coveredUsers} of ${profiles.length} active demo profiles; increase --days or --participants`)
    const pointsByUser = new Map<string, number>()
    for (const plan of plans) for (const entry of plan.entries) pointsByUser.set(entry.userId, (pointsByUser.get(entry.userId) ?? 0) + entry.points)
    const managersWithPositivePoints = [...pointsByUser.values()].filter(points => points > 0).length
    const managersWithoutPositivePoints = profiles.length - managersWithPositivePoints

    const summary = {
        season: input.season,
        gameDays: days.length,
        games: days.reduce((sum, day) => sum + day.games.length, 0),
        profiles: profiles.length,
        usersCovered: coveredUsers,
        managersWithPositivePoints,
        managersWithoutPositivePoints,
        participantsPerDay: Math.min(profiles.length, input.participantsPerDay),
        entriesPlanned,
        sourceDates: days.map(day => day.sourceDate),
        dryRun: input.dryRun,
    }
    if (input.dryRun) return { ...summary, entriesCreated: 0 }

    const contests = []
    for (const { day } of plans) {
        const slateKey = `season-${input.season}`
        const key = { mode: 'REPLAY' as const, leagueSlug: 'mlb', contestDate: day.sourceDate, slateKey }
        const existing = await db.dailyContest.findUnique({ where: { mode_leagueSlug_contestDate_slateKey: key }, select: { id: true, status: true } })
        if (existing?.status === 'CANCELLED') throw new Error(`Replay for ${day.sourceDate} is cancelled; refusing to restore it`)
        contests.push({ day, key, existing })
    }

    let entriesCreated = 0
    for (let dayIndex = 0; dayIndex < plans.length; dayIndex++) {
        const plan = plans[dayIndex]
        const { day, key } = contests[dayIndex]
        const firstPitch = plan.locksAt
        const contest = await db.dailyContest.upsert({
            where: { mode_leagueSlug_contestDate_slateKey: key },
            create: {
                ...key,
                name: `MLB ${input.season} Replay Classic`,
                sourceDate: day.sourceDate,
                locksAt: firstPitch,
                status: 'LOCKED',
                scoringRule: json(rule),
                games: json(day.games),
                playerPool: json(day.players),
                createdAt: new Date(firstPitch.getTime() - 86400000),
            },
            update: {},
        })

        await db.$transaction(async tx => {
            for (const box of day.boxScores) {
                await tx.dailyGameSnapshot.upsert({
                    where: { gamePk: box.gamePk },
                    create: { gamePk: box.gamePk, leagueSlug: 'mlb', status: box.status, boxScore: json(box), complete: true, observedAt: now },
                    update: { leagueSlug: 'mlb', status: box.status, boxScore: json(box), complete: true, observedAt: now },
                })
            }
            await tx.dailyContest.update({ where: { id: contest.id }, data: { games: json(day.games), playerPool: json(day.players), scoringRule: json(rule) } })
        }, { timeout: 60000 })

        for (let offset = 0; offset < plan.entries.length; offset += 500) {
            const batch = plan.entries.slice(offset, offset + 500)
            const created = await db.$transaction(async tx => {
                const inserted = await tx.dailyEntry.createManyAndReturn({
                    data: batch.map(entry => ({
                        contestId: contest.id,
                        userId: entry.userId,
                        teamName: entry.picks.teamName,
                        captainExternalPlayerId: entry.picks.captainExternalPlayerId,
                        lineup: json(entry.lineup),
                        points: entry.points,
                        isFinal: true,
                        createdAt: entry.createdAt,
                    })),
                    skipDuplicates: true,
                    select: { id: true },
                })
                const existingEntries = await tx.dailyEntry.findMany({ where: { contestId: contest.id, userId: { in: batch.map(entry => entry.userId) } }, select: { id: true, userId: true } })
                const entryByUser = new Map(existingEntries.map(entry => [entry.userId, entry.id]))
                const events = batch.flatMap(entry => {
                    const entryId = entryByUser.get(entry.userId)
                    if (!entryId) throw new Error('Unable to resolve seeded season entry')
                    return [
                        { sourceKey: `entry_joined:${entryId}`, kind: 'ENTRY_JOINED', userId: entry.userId, contestId: contest.id, occurredAt: entry.createdAt, payload: { detail: `Joined MLB ${input.season} Replay Classic` } },
                        { sourceKey: `lineup_locked:${entryId}`, kind: 'LINEUP_LOCKED', userId: entry.userId, contestId: contest.id, occurredAt: plan.locksAt, payload: { detail: 'Lineup locked for the completed MLB game day' } },
                    ]
                })
                await tx.communityEvent.createMany({ data: events, skipDuplicates: true })
                return inserted.length
            }, { timeout: 60000 })
            entriesCreated += created
        }

        await db.$transaction([
            db.dailyContest.update({ where: { id: contest.id }, data: { status: 'COMPLETED' } }),
            db.communityEvent.upsert({
                where: { sourceKey: `completed:${contest.id}` },
                create: { sourceKey: `completed:${contest.id}`, kind: 'CONTEST_COMPLETED', contestId: contest.id, occurredAt: new Date(plan.locksAt.getTime() + 300000), payload: { detail: `MLB ${input.season} Replay Classic results are final` } },
                update: {},
            }),
        ])
    }

    await refreshManagerStandings('REPLAY', now, db)
    return { ...summary, dryRun: false, entriesCreated }
}
