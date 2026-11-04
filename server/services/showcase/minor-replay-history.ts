import type { PrismaClient, Prisma } from '../../../src/generated/prisma/client'
import type { DailyGame, DailyPlayer } from '@/shared/daily-contests'
import { CONTEST_GAME_TYPES, MINOR_CONTEST_LEAGUES, MINOR_CONTEST_SOURCE } from '../../providers/contest-source-registry'
import type { ProviderBoxScore } from '../../providers/dto/provider-schedule.dto'
import { MlbSportsProvider } from '../../providers/mlb/mlb.provider'
import type { ISportsProvider } from '../../providers/sports-provider.interface'
import { refreshManagerStandings } from '../community/manager-standings.service'
import { dailyContestName } from '../daily-contests/daily-contest-names'
import { canPublishPool, scoreDailyLineup, validateDailyLineup } from '../daily-contests/daily-rules'
import { parseScoringRule } from '../scoring/scoring-rule.schema'
import { chooseDemoLineup, dailyParticipants } from './demo-simulation'
import { collectPlayableReplayDays } from './replay-days'

// A replay slate keeps the real games of one finished day, capped per level so one day stays quick to load.
const GAMES_PER_LEVEL = 6
const MIN_GAMES = 10
const LOOKBACK_DAYS = 150
const DAY_MS = 86400000

export interface MinorReplayDay {
    sourceDate: string
    games: DailyGame[]
    players: DailyPlayer[]
    boxScores: ProviderBoxScore[]
}

const json = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value))

/** The most recent days first, starting yesterday. */
export function minorReplayCandidates(now: Date, lookbackDays = LOOKBACK_DAYS): string[] {
    return Array.from({ length: lookbackDays }, (_, n) => new Date(now.getTime() - (n + 1) * DAY_MS).toISOString().slice(0, 10))
}

/** One finished day of High-A, Single-A and Rookie games with real box scores, or null when the day is too thin. */
export async function loadMinorReplayDay(provider: ISportsProvider, sourceDate: string): Promise<MinorReplayDay | null> {
    if (!provider.getGameRoster) return null
    const season = Number(sourceDate.slice(0, 4))
    const games: DailyGame[] = []
    const players: DailyPlayer[] = []
    const boxScores: ProviderBoxScore[] = []

    for (const league of MINOR_CONTEST_LEAGUES) {
        const schedule = await provider.getSchedule({
            startDateUtc: new Date(`${sourceDate}T00:00:00Z`),
            endDateUtc: new Date(`${sourceDate}T23:59:59Z`),
            season,
            league,
            gameTypes: CONTEST_GAME_TYPES,
        })
        const finals = schedule.filter((game) => game.status === 'FINAL').sort((a, b) => a.gamePk - b.gamePk).slice(0, GAMES_PER_LEVEL)
        if (!finals.length) continue
        const teams = new Map((await provider.getTeams({ season, league })).map((team) => [team.id, team.name]))
        for (const game of finals) {
            const [roster, box] = await Promise.all([provider.getGameRoster(game.gamePk), provider.getBoxScore(game.gamePk, { league })])
            if (!roster || !box || box.status !== 'FINAL' || (!box.batters.length && !box.pitchers.length)) continue
            games.push({
                ...game,
                sourceLeagueSlug: league,
                homeTeamName: teams.get(game.homeTeamId) ?? `Club ${game.homeTeamId}`,
                awayTeamName: teams.get(game.awayTeamId) ?? `Club ${game.awayTeamId}`,
            })
            players.push(...roster.players)
            boxScores.push(box)
        }
    }

    const pool = [...new Map(players.map((player) => [player.externalPlayerId, player])).values()]
    if (games.length < MIN_GAMES || !canPublishPool(pool, 80000)) return null
    return { sourceDate, games, players: pool, boxScores }
}

/**
 * Publishes completed Replay contests for the Minor Leagues source from real finished days,
 * with demo entries scored from the actual box scores. Safe to rerun: finished days are skipped.
 */
export async function seedMinorLeagueReplay(
    db: PrismaClient,
    input: { days: number; participantsPerDay: number; seed: string; dryRun: boolean; now?: Date },
    provider: ISportsProvider = new MlbSportsProvider(),
) {
    const now = input.now ?? new Date()
    if (!Number.isInteger(input.days) || input.days < 1 || input.days > 30 || !Number.isInteger(input.participantsPerDay) || input.participantsPerDay < 1) throw new Error('Invalid history size')
    const profiles = await db.demoProfile.findMany({ where: { datasetSeed: input.seed }, orderBy: { ordinal: 'asc' } })
    if (!profiles.length) throw new Error('Import demo profiles before history')
    const ruleRow = await db.scoringRule.findFirst({ where: { isDefault: true } })
    if (!ruleRow) throw new Error('Default baseball scoring rule is required')
    const rule = parseScoringRule(ruleRow.rules)

    // Newest days found first; replay them oldest to newest so contest dates run forward.
    const archives = (await collectPlayableReplayDays(minorReplayCandidates(now), input.days, (date) => loadMinorReplayDay(provider, date))).reverse()
    const participants = Math.min(profiles.length, input.participantsPerDay)
    if (input.dryRun) return { days: archives.map((day) => ({ sourceDate: day.sourceDate, games: day.games.length, players: day.players.length })), profiles: profiles.length, entries: archives.length * participants, dryRun: true }

    let entriesCreated = 0
    for (const [day, archive] of archives.entries()) {
        const contestDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - archives.length + day)).toISOString().slice(0, 10)
        const key = { mode: 'REPLAY' as const, leagueSlug: MINOR_CONTEST_SOURCE, contestDate, slateKey: 'classic' }
        const previous = await db.dailyContest.findUnique({ where: { mode_leagueSlug_contestDate_slateKey: key }, include: { _count: { select: { entries: true } } } })
        if (previous?.status === 'COMPLETED' && previous._count.entries >= participants) continue

        const locksAt = new Date(`${contestDate}T19:00:00Z`)
        for (const box of archive.boxScores) {
            const league = archive.games.find((game) => game.gamePk === box.gamePk)?.sourceLeagueSlug ?? 'high-a'
            await db.dailyGameSnapshot.upsert({ where: { gamePk: box.gamePk }, create: { gamePk: box.gamePk, leagueSlug: league, status: box.status, boxScore: json(box), complete: true }, update: {} })
        }
        const contest = await db.dailyContest.upsert({
            where: { mode_leagueSlug_contestDate_slateKey: key },
            create: { ...key, name: dailyContestName(MINOR_CONTEST_SOURCE, contestDate), sourceDate: archive.sourceDate, locksAt, games: json(archive.games), playerPool: json(archive.players), scoringRule: json(rule), createdAt: new Date(`${contestDate}T00:00:00Z`) },
            update: {},
        })

        const selected = dailyParticipants(profiles.length, day, input.participantsPerDay)
        for (let batchStart = 0; batchStart < selected.length; batchStart += 500) {
            const rows = selected.slice(batchStart, batchStart + 500).map((index, n) => {
                const profile = profiles[index]
                const picks = chooseDemoLineup(archive.players, `${profile.demoKey}:${archive.sourceDate}`, profile.strategy, profile.demoKey)
                const slots = validateDailyLineup(picks, archive.players, 80000)
                const score = scoreDailyLineup(slots, picks.captainExternalPlayerId ?? null, archive.boxScores, rule, 1.5)
                const createdAt = new Date(locksAt.getTime() - 3600000 - ((batchStart + n) % 180) * 60000)
                return { profile, picks, score, createdAt }
            })
            entriesCreated += await db.$transaction(async (tx) => {
                const created = await tx.dailyEntry.createManyAndReturn({ data: rows.map((row) => ({ contestId: contest.id, userId: row.profile.userId, teamName: row.picks.teamName, captainExternalPlayerId: row.picks.captainExternalPlayerId, lineup: json(row.score.slots), points: row.score.points, isFinal: true, createdAt: row.createdAt })), skipDuplicates: true, select: { id: true } })
                const entries = await tx.dailyEntry.findMany({ where: { contestId: contest.id, userId: { in: rows.map((row) => row.profile.userId) } }, select: { id: true, userId: true } })
                const byUser = new Map(entries.map((entry) => [entry.userId, entry.id]))
                const events = rows.flatMap((row) => {
                    const entryId = byUser.get(row.profile.userId)
                    if (!entryId) throw new Error('Unable to resolve imported daily entry')
                    return ([['ENTRY_JOINED', row.createdAt], ['LINEUP_LOCKED', locksAt]] as const).map(([kind, at]) => ({ sourceKey: `${kind.toLowerCase()}:${entryId}`, kind, userId: row.profile.userId, contestId: contest.id, occurredAt: at, payload: { detail: kind === 'ENTRY_JOINED' ? `Joined ${contest.name}` : 'Daily lineup locked' } }))
                })
                await tx.communityEvent.createMany({ data: events, skipDuplicates: true })
                return created.length
            }, { timeout: 60000 })
        }
        await db.$transaction([
            db.dailyContest.update({ where: { id: contest.id }, data: { status: 'COMPLETED' } }),
            db.communityEvent.upsert({ where: { sourceKey: `completed:${contest.id}` }, create: { sourceKey: `completed:${contest.id}`, kind: 'CONTEST_COMPLETED', contestId: contest.id, occurredAt: new Date(locksAt.getTime() + 300000), payload: { detail: `${contest.name} finished` } }, update: {} }),
        ])
    }
    await refreshManagerStandings('REPLAY', now, db)
    return { days: archives.length, profiles: profiles.length, entries: entriesCreated, dryRun: false }
}
