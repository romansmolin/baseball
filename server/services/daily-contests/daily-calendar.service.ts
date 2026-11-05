import type { PrismaClient } from '../../../src/generated/prisma/client'
import { assertWorkTime } from '../showcase/work-deadline'
import { prisma } from '../../lib/prisma'
import { MlbSportsProvider } from '../../providers/mlb/mlb.provider'
import {
    NORTH_AMERICA_CONTEST_SOURCE,
    MINOR_CONTEST_LEAGUES,
    MINOR_CONTEST_SOURCE,
    minorContestsEnabled,
    WINTER_CONTEST_SOURCE,
    winterContestsEnabled,
    type ContestSourceSlug,
} from '../../providers/contest-source-registry'
import type { ISportsProvider } from '../../providers/sports-provider.interface'
import { WINTER_LEAGUE_SOURCES, type BaseballProviderLeague } from '@/shared/baseball'
import type { DailyGame, DailyPlayer } from '@/shared/daily-contests'
import { providerPositionToPoolPosition } from '@/shared/team-builder'
import { canPublishPool, dailyDate, dailyDateOffset } from './daily-rules'
import { dailyContestName } from './daily-contest-names'
import { loadDailySchedule, loadNorthAmericanContestSchedule, type DailyScheduledGame } from './daily-schedule.service'
import { splitWinterByLeague } from './winter-league-split'
import { mapWithConcurrency } from '../../shared/concurrency.utils'
import { playerSalary, salaryStatsSeason } from './player-salary'
import { isPrismaError } from '../../shared/db/prisma-error.utils'

export const DAILY_CALENDAR_DAYS = 7
// A slate with fewer real games than this is not worth entering, so it is not published.
export const DEFAULT_MIN_SLATE_GAMES = 3
export const minSlateGames = (env: Record<string, string | undefined> = process.env): number => {
    const value = Number(env.CONTEST_MIN_SLATE_GAMES)
    return Number.isInteger(value) && value >= 1 ? value : DEFAULT_MIN_SLATE_GAMES
}
const DAY_MS = 86400000
const ACCEPTED_POSITIONS = new Set(['P', 'SP', 'RP', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'OF', 'DH'])

function addCalendarDays(date: string, amount: number): string {
    const value = new Date(`${date}T12:00:00.000Z`)
    value.setUTCDate(value.getUTCDate() + amount)
    return value.toISOString().slice(0, 10)
}

/** Convert local midnight to UTC without assuming a fixed New York offset. */
function newYorkMidnightUtc(date: string): Date {
    const [year, month, day] = date.split('-').map(Number)
    const targetWallClock = Date.UTC(year, month - 1, day)
    let guess = targetWallClock
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    })
    for (let i = 0; i < 3; i++) {
        const parts = Object.fromEntries(formatter.formatToParts(new Date(guess)).map(part => [part.type, part.value]))
        const wallClock = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second))
        guess += targetWallClock - wallClock
    }
    return new Date(guess)
}

type ScheduledRow = DailyScheduledGame

export class DailyCalendarService {
    private readonly provider: ISportsProvider
    private readonly db: PrismaClient

    constructor(provider: ISportsProvider = new MlbSportsProvider(), db: PrismaClient = prisma) {
        this.provider = provider
        this.db = db
    }

    async loadReplayDay({ season, sourceDate }: { season: number; sourceDate: string }) {
        const schedule = await this.provider.getSchedule({
            startDateUtc: new Date(`${sourceDate}T00:00:00Z`),
            endDateUtc: new Date(`${sourceDate}T23:59:59Z`),
            season,
            league: 'mlb',
        })
        const games = schedule.filter(game => game.status === 'FINAL')
        const teams = await this.provider.getTeams({ season, league: 'mlb' })
        const players: DailyPlayer[] = []
        const boxScores = []
        for (const game of games) {
            assertWorkTime()
            const roster = await this.provider.getGameRoster?.(game.gamePk)
            const box = await this.provider.getBoxScore(game.gamePk, { league: 'mlb' })
            if (!roster || !box || (!box.batters.length && !box.pitchers.length)) {
                throw new Error(`Incomplete archive game ${game.gamePk}`)
            }
            players.push(...roster.players)
            boxScores.push(box)
        }
        const unique = [...new Map(players.map(player => [player.externalPlayerId, player])).values()]
        return {
            sourceDate,
            games: games.map(game => ({
                ...game,
                homeTeamName: teams.find(team => team.id === game.homeTeamId)?.name ?? 'Home',
                awayTeamName: teams.find(team => team.id === game.awayTeamId)?.name ?? 'Away',
            })),
            players: unique,
            boxScores,
        }
    }

    async publishDailyContests({ now, lookaheadDays = DAILY_CALENDAR_DAYS }: { now: Date; lookaheadDays?: number }) {
        if (!Number.isInteger(lookaheadDays) || lookaheadDays < 1 || lookaheadDays > 14) {
            throw new Error('Invalid daily contest lookahead')
        }
        const rule = await this.db.scoringRule.findFirst({ where: { isDefault: true } })
        if (!rule) return { published: 0 }

        const today = dailyDate(now)
        const range = { startDateUtc: newYorkMidnightUtc(today), endDateUtc: newYorkMidnightUtc(dailyDateOffset(now, lookaheadDays + 2)) }
        // Winter games are read once and published twice: combined, and per league.
        const once = <T>(load: () => Promise<T>) => { let pending: Promise<T> | undefined; return () => (pending ??= load()) }
        const winterRows = once(() => loadDailySchedule(this.provider, { ...range, league: 'winter-leagues' as const }))
        const winterByLeague = once(async () => splitWinterByLeague(this.provider, await winterRows()))
        const sources: { slug: ContestSourceSlug; load: () => Promise<ScheduledRow[]> }[] = [
            { slug: NORTH_AMERICA_CONTEST_SOURCE, load: () => loadNorthAmericanContestSchedule(this.provider, range) },
            ...(winterContestsEnabled(process.env)
                ? [
                    { slug: WINTER_CONTEST_SOURCE, load: winterRows },
                    ...WINTER_LEAGUE_SOURCES.map(league => ({ slug: league.slug, load: async () => (await winterByLeague()).get(league.slug) ?? [] })),
                ]
                : []),
            ...(minorContestsEnabled(process.env)
                ? [{ slug: MINOR_CONTEST_SOURCE, load: () => loadNorthAmericanContestSchedule(this.provider, range, MINOR_CONTEST_LEAGUES) }]
                : []),
        ]

        // A source whose schedule cannot be read must not stop the others from publishing.
        let published = 0
        let loaded = 0
        let failure: unknown
        for (const source of sources) {
            let scheduled: ScheduledRow[]
            try {
                scheduled = await source.load()
            } catch (error) {
                if (error instanceof Error && error.name === 'WorkDeadlineError') throw error
                failure ??= error
                console.warn(`[daily-calendar] ${source.slug} schedule unavailable`, error)
                continue
            }
            loaded++
            published += await this.publishSlates(source.slug, scheduled, rule, now, lookaheadDays)
        }
        if (!loaded) throw failure
        return { published }
    }

    private async publishSlates(leagueSlug: ContestSourceSlug, scheduled: ScheduledRow[], rule: { rules: unknown }, now: Date, lookaheadDays: number): Promise<number> {
        const today = dailyDate(now)
        const sourceSeasons = new Map<string, BaseballProviderLeague>()
        const scheduledTeams = new Map<string, { teamId: number; season: number; league: BaseballProviderLeague }>()
        for (const row of scheduled) {
            const league = row.sourceLeagueSlug
            if (!league) continue
            sourceSeasons.set(`${league}:${row.apiSeason}`, league)
            for (const teamId of [row.game.homeTeamId, row.game.awayTeamId]) {
                scheduledTeams.set(`${league}:${row.apiSeason}:${teamId}`, { teamId, season: row.apiSeason, league })
            }
        }

        const teamNames = new Map<string, string>()
        await Promise.all([...sourceSeasons].map(async ([key, league]) => {
            const season = Number(key.slice(key.lastIndexOf(':') + 1))
            try {
                const teams = await this.provider.getTeams({ season, league })
                for (const team of teams) teamNames.set(`${league}:${season}:${team.id}`, team.name)
            } catch (error) {
                if (error instanceof Error && error.name === 'WorkDeadlineError') throw error
                console.warn(`[daily-calendar] Team names unavailable for ${league} ${season}`, error)
            }
        }))

        const rosterCache = new Map<string, DailyPlayer[]>()
        await mapWithConcurrency([...scheduledTeams], 6, async ([key, team]) => {
            assertWorkTime(1000)
            try {
                const roster = await this.provider.getPlayersByTeam(team.teamId, { season: team.season, league: team.league, statsSeason: salaryStatsSeason(team.season, now) })
                const accepted = roster.filter(player => ACCEPTED_POSITIONS.has(player.primaryPosition))
                rosterCache.set(key, accepted.map(player => ({
                    externalPlayerId: player.id,
                    name: player.fullName,
                    position: providerPositionToPoolPosition(player.primaryPosition),
                    teamId: team.teamId,
                    teamName: player.teamName ?? teamNames.get(key) ?? `Club ${team.teamId}`,
                    salary: playerSalary(player),
                    photoUrl: player.photoUrl,
                })))
            } catch (error) {
                if (error instanceof Error && error.name === 'WorkDeadlineError') throw error
                console.warn(`[daily-calendar] Skipped roster ${key}`, error)
                rosterCache.set(key, [])
            }
        })

        const gamesByDate = new Map<string, ScheduledRow[]>()
        for (const row of scheduled) {
            const date = dailyDate(new Date(row.game.gameDateUtc))
            const rows = gamesByDate.get(date) ?? []
            rows.push(row)
            gamesByDate.set(date, rows)
        }

        const windows: { date: string; slateKey: 'classic' | 'weekend'; rows: ScheduledRow[] }[] = []
        for (let offset = 0; offset < lookaheadDays; offset++) {
            const date = dailyDateOffset(now, offset)
            const rows = gamesByDate.get(date) ?? []
            if (rows.length) windows.push({ date, slateKey: 'classic', rows })
        }
        const lastDailyDate = dailyDateOffset(now, lookaheadDays - 1)
        for (let date = today; date <= lastDailyDate; date = addCalendarDays(date, 1)) {
            if (new Date(`${date}T12:00:00Z`).getUTCDay() !== 6) continue
            const sunday = addCalendarDays(date, 1)
            const rows = [...(gamesByDate.get(date) ?? []), ...(gamesByDate.get(sunday) ?? [])]
            if (rows.length) windows.push({ date, slateKey: 'weekend', rows })
        }

        let published = 0
        for (const window of windows) {
            assertWorkTime()
            const key = {
                mode: 'LIVE' as const,
                leagueSlug,
                contestDate: window.date,
                slateKey: window.slateKey,
            }
            const existing = await this.db.dailyContest.findUnique({ where: { mode_leagueSlug_contestDate_slateKey: key } })
            if (existing) continue

            const allScheduled = window.rows.filter(row => row.game.status !== 'CANCELLED')
            if (!allScheduled.length) continue
            // Never publish a daily or weekend slate after any included-day
            // game has begun. This keeps the saved pool and score window fixed.
            if (allScheduled.some(row => Date.parse(row.game.gameDateUtc) <= now.getTime())) continue
            const future = allScheduled.filter(row => row.game.status === 'SCHEDULED' && Date.parse(row.game.gameDateUtc) > now.getTime())
            if (!future.length) continue

            const eligible = future.filter(({ game, apiSeason, sourceLeagueSlug }) => {
                if (!sourceLeagueSlug) return false
                const prefix = `${sourceLeagueSlug}:${apiSeason}:`
                return rosterCache.has(`${prefix}${game.homeTeamId}`)
                    && rosterCache.has(`${prefix}${game.awayTeamId}`)
                    && (rosterCache.get(`${prefix}${game.homeTeamId}`)?.length ?? 0) > 0
                    && (rosterCache.get(`${prefix}${game.awayTeamId}`)?.length ?? 0) > 0
            })
            if (eligible.length < minSlateGames()) continue

            const eligibleTeamKeys = new Set(eligible.flatMap(({ game, apiSeason, sourceLeagueSlug }) => sourceLeagueSlug
                ? [`${sourceLeagueSlug}:${apiSeason}:${game.homeTeamId}`, `${sourceLeagueSlug}:${apiSeason}:${game.awayTeamId}`]
                : []))
            const pool = [...new Map([...eligibleTeamKeys].flatMap(teamKey => rosterCache.get(teamKey) ?? [])
                .map(player => [player.externalPlayerId, player])).values()]
            if (!canPublishPool(pool, 80000)) continue

            const mapped: DailyGame[] = eligible.map(({ game, apiSeason, sourceLeagueSlug }) => ({
                ...game,
                sourceLeagueSlug,
                homeTeamName: teamNames.get(`${sourceLeagueSlug}:${apiSeason}:${game.homeTeamId}`) ?? `Club ${game.homeTeamId}`,
                awayTeamName: teamNames.get(`${sourceLeagueSlug}:${apiSeason}:${game.awayTeamId}`) ?? `Club ${game.awayTeamId}`,
            }))
            const locksAt = new Date(Math.min(...eligible.map(({ game }) => Date.parse(game.gameDateUtc))))
            if (locksAt <= now) continue

            const created = await this.db.dailyContest.upsert({
                where: { mode_leagueSlug_contestDate_slateKey: key },
                create: {
                    ...key,
                    name: dailyContestName(leagueSlug, window.date, window.slateKey),
                    sourceDate: window.date,
                    locksAt,
                    scoringRule: JSON.parse(JSON.stringify(rule.rules)),
                    games: JSON.parse(JSON.stringify(mapped)),
                    playerPool: JSON.parse(JSON.stringify(pool)),
                },
                update: {},
            }).then(() => true, (error: unknown) => {
                // A concurrent publisher created this slate first; keep its row.
                if (isPrismaError(error, 'P2002')) return false
                throw error
            })
            if (created) published++
        }

        return published
    }
}
