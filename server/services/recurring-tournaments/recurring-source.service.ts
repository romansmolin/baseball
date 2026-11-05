import type { ISportsProvider } from '../../providers/sports-provider.interface'
import { CONTEST_GAME_TYPES, NORTH_AMERICA_CONTEST_LEAGUES } from '../../providers/contest-source-registry'
import type { BaseballProviderLeague } from '@/shared/baseball'
import type { DailyPlayer } from '@/shared/daily-contests'
import { providerPositionToPoolPosition } from '@/shared/team-builder'
import { canPublishPool } from '../daily-contests/daily-rules'
import { playerSalary, salaryStatsSeason } from '../daily-contests/player-salary'
import type { RecurringGame, RecurringSourceSnapshot, RecurringWindow } from './recurring.types'

export interface SourceCheckpoint {
    windowKey: string
    phase: 'SCHEDULE' | 'ROSTERS' | 'BOX_SCORES' | 'VERIFY'
    offset: number
    games: RecurringGame[]
    rostersBySeasonAndTeam: Record<string, DailyPlayer[]>
    teamNamesBySeason: Record<string, Record<string, string>>
    historicalGameKeys: string[]
    historicalPlayers: DailyPlayer[]
    successfulScheduleQueries?: number
}
/** Rosters and team names already read for another window of the same run. */
export interface RosterSeed {
    rosters: Record<string, DailyPlayer[]>
    teamNames: Record<string, Record<string, string>>
}
export type SourceInspection = { ok: true; snapshot: RecurringSourceSnapshot; seed: RosterSeed }
    | { ok: false; reason: 'SOURCE_UNAVAILABLE' | 'EMPTY_WEEK' | 'INVALID_POOL' }
    | { ok: false; reason: 'INCOMPLETE_BATCH'; checkpoint: SourceCheckpoint }

const weekMs = 7 * 86400000
const acceptedPositions = new Set(['P', 'SP', 'RP', 'C', '1B', '2B', '3B', 'SS', 'OF', 'LF', 'CF', 'RF', 'DH'])
const teamKey = (league: string, season: number, teamId: number) => `${league}:${season}:${teamId}`
const sourceGameKey = (league: string, gamePk: number) => `${league}:${gamePk}`

function sourceLeagues(window: RecurringWindow): readonly BaseballProviderLeague[] {
    // The old Winter Championship remains scoreable from its saved source.
    return window.sourceSlug === 'winter-leagues' ? ['winter-leagues'] : NORTH_AMERICA_CONTEST_LEAGUES
}

function sourceForGame(window: RecurringWindow, game: RecurringGame): BaseballProviderLeague | undefined {
    return game.sourceLeagueSlug ?? (window.sourceSlug === 'winter-leagues' ? 'winter-leagues' : undefined)
}

export async function inspectRecurringSource(
    provider: ISportsProvider,
    window: RecurringWindow,
    options: { historical: boolean; checkpoint?: SourceCheckpoint; deadline?: number; rosterSeed?: RosterSeed },
): Promise<SourceInspection> {
    const key = `${window.templateKey}:${window.sourceSlug}:${window.startsAt.toISOString()}:${window.endsAt.toISOString()}:${options.historical}`
    if (options.checkpoint && options.checkpoint.windowKey !== key) throw new Error('Source checkpoint belongs to a different window')
    const checkpoint: SourceCheckpoint = options.checkpoint
        ? structuredClone(options.checkpoint)
        : {
            windowKey: key,
            phase: 'SCHEDULE',
            offset: 0,
            games: [],
            rostersBySeasonAndTeam: { ...options.rosterSeed?.rosters },
            teamNamesBySeason: { ...options.rosterSeed?.teamNames },
            historicalGameKeys: [],
            historicalPlayers: [],
            successfulScheduleQueries: 0,
        }
    checkpoint.successfulScheduleQueries ??= 0
    const pending = (): SourceInspection => ({ ok: false, reason: 'INCOMPLETE_BATCH', checkpoint })
    const timeLeft = () => options.deadline === undefined || Date.now() + 500 < options.deadline
    const years = Array.from({ length: window.endsAt.getUTCFullYear() - window.startsAt.getUTCFullYear() + 1 }, (_, n) => window.startsAt.getUTCFullYear() + n)
    const leagues = sourceLeagues(window)
    const seasons = window.sourceSlug === 'winter-leagues'
        ? [...new Set(years.flatMap(year => [year, year - 1]))].sort((a, b) => b - a)
        : years
    const queries = leagues.flatMap(league => seasons.map(season => ({ league, season })))

    try {
        if (checkpoint.phase === 'SCHEDULE') {
            for (; checkpoint.offset < queries.length; checkpoint.offset++) {
                if (!timeLeft()) return pending()
                const { league, season } = queries[checkpoint.offset]
                try {
                    const games = await provider.getSchedule({ league, season, startDateUtc: window.startsAt, endDateUtc: window.endsAt, ...(window.sourceSlug === 'north-america' ? { gameTypes: CONTEST_GAME_TYPES } : {}) })
                    checkpoint.successfulScheduleQueries++
                    const seen = new Set(checkpoint.games.map(game => sourceGameKey(game.sourceLeagueSlug ?? window.sourceSlug, game.gamePk)))
                    for (const game of games) {
                        const at = new Date(game.gameDateUtc)
                        const gameKey = sourceGameKey(league, game.gamePk)
                        if (at < window.startsAt || at >= window.endsAt || game.status === 'CANCELLED' || seen.has(gameKey)) continue
                        seen.add(gameKey)
                        checkpoint.games.push({
                            ...game,
                            sourceLeagueSlug: league,
                            originalStartUtc: game.gameDateUtc,
                            apiSeason: season,
                            week: Math.floor((at.getTime() - window.startsAt.getTime()) / weekMs) + 1,
                            homeTeamName: `Club ${game.homeTeamId}`,
                            awayTeamName: `Club ${game.awayTeamId}`,
                        })
                    }
                } catch (error) {
                    if (error instanceof Error && error.name === 'WorkDeadlineError') throw error
                    // Continue with other eligible sources; a single league's
                    // outage must not block valid games from the remaining set.
                }
            }
            if (!checkpoint.successfulScheduleQueries) return { ok: false, reason: 'SOURCE_UNAVAILABLE' }
            checkpoint.games.sort((a, b) => Date.parse(a.originalStartUtc) - Date.parse(b.originalStartUtc) || a.gamePk - b.gamePk)
            checkpoint.phase = 'ROSTERS'
            checkpoint.offset = 0
        }

        const rosterGames = checkpoint.games.filter(game => !options.historical || game.status !== 'FINAL')
        const teams = [...new Map(rosterGames.flatMap(game => {
            const league = sourceForGame(window, game)
            if (!league) return []
            return [game.homeTeamId, game.awayTeamId].map(id => {
                const team = { id, season: game.apiSeason, league }
                return [teamKey(league, team.season, id), team] as const
            })
        })).entries()]

        if (checkpoint.phase === 'ROSTERS') {
            for (; checkpoint.offset < teams.length; checkpoint.offset++) {
                if (!timeLeft()) return pending()
                const [keyForTeam, team] = teams[checkpoint.offset]
                if (checkpoint.rostersBySeasonAndTeam[keyForTeam]?.length) continue
                if (!checkpoint.teamNamesBySeason[`${team.league}:${team.season}`]) {
                    try {
                        const names = await provider.getTeams({ league: team.league, season: team.season })
                        checkpoint.teamNamesBySeason[`${team.league}:${team.season}`] = Object.fromEntries(names.map(row => [String(row.id), row.name]))
                    } catch (error) {
                        if (error instanceof Error && error.name === 'WorkDeadlineError') throw error
                        checkpoint.teamNamesBySeason[`${team.league}:${team.season}`] = {}
                    }
                    if (!timeLeft()) return pending()
                }
                try {
                    const players = await provider.getPlayersByTeam(team.id, { league: team.league, season: team.season, statsSeason: salaryStatsSeason(team.season, new Date()) })
                    checkpoint.rostersBySeasonAndTeam[keyForTeam] = players
                        .filter(player => acceptedPositions.has(player.primaryPosition))
                        .map(player => ({
                            externalPlayerId: player.id,
                            name: player.fullName,
                            position: providerPositionToPoolPosition(player.primaryPosition),
                            teamId: team.id,
                            teamName: player.teamName ?? checkpoint.teamNamesBySeason[`${team.league}:${team.season}`]?.[team.id] ?? `Club ${team.id}`,
                            salary: playerSalary(player),
                            photoUrl: player.photoUrl,
                        }))
                } catch (error) {
                    if (error instanceof Error && error.name === 'WorkDeadlineError') throw error
                    checkpoint.rostersBySeasonAndTeam[keyForTeam] = []
                }
            }
            checkpoint.phase = 'BOX_SCORES'
            checkpoint.offset = 0
        }

        if (checkpoint.phase === 'BOX_SCORES') {
            const historical = options.historical ? checkpoint.games.filter(game => game.status === 'FINAL') : []
            for (; checkpoint.offset < historical.length; checkpoint.offset++) {
                if (!timeLeft()) return pending()
                const game = historical[checkpoint.offset]
                const league = sourceForGame(window, game)
                if (!league) return { ok: false, reason: 'SOURCE_UNAVAILABLE' }
                const gameKey = sourceGameKey(league, game.gamePk)
                const roster = await provider.getGameRoster?.(game.gamePk, { league, deadline: options.deadline })
                const box = await provider.getBoxScore(game.gamePk, { league, deadline: options.deadline })
                if (!roster?.players.length || !box?.batters.length || !box.pitchers.length) return { ok: false, reason: 'SOURCE_UNAVAILABLE' }
                checkpoint.historicalGameKeys.push(gameKey)
                checkpoint.historicalPlayers.push(...roster.players.map(player => ({ ...player, salary: 4000 + (player.externalPlayerId % 7) * 1000 })))
            }
            checkpoint.phase = 'VERIFY'
            checkpoint.offset = 0
        }

        const historicalIds = new Set(checkpoint.historicalGameKeys)
        const eligible = checkpoint.games.filter(game => {
            const league = sourceForGame(window, game)
            if (!league) return false
            const gameKey = sourceGameKey(league, game.gamePk)
            return historicalIds.has(gameKey)
                || (checkpoint.rostersBySeasonAndTeam[teamKey(league, game.apiSeason, game.homeTeamId)]?.length
                    && checkpoint.rostersBySeasonAndTeam[teamKey(league, game.apiSeason, game.awayTeamId)]?.length)
        })
        for (let week = 1; week <= window.totalWeeks; week++) {
            if (!eligible.some(game => game.week === week)) return { ok: false, reason: 'EMPTY_WEEK' }
        }
        const teamKeys = new Set(eligible.filter(game => {
            const league = sourceForGame(window, game)
            return league !== undefined && !historicalIds.has(sourceGameKey(league, game.gamePk))
        }).flatMap(game => {
            const league = sourceForGame(window, game)
            if (!league) return []
            return [teamKey(league, game.apiSeason, game.homeTeamId), teamKey(league, game.apiSeason, game.awayTeamId)]
        }))
        const candidates = [...checkpoint.historicalPlayers, ...[...teamKeys].flatMap(team => checkpoint.rostersBySeasonAndTeam[team] ?? [])]
        const pool = [...new Map(candidates.map(player => [player.externalPlayerId, player])).values()]
        if (!canPublishPool(pool, 80000)) return { ok: false, reason: 'INVALID_POOL' }

        const games = eligible.map(game => {
            const league = sourceForGame(window, game)!
            const names = checkpoint.teamNamesBySeason[`${league}:${game.apiSeason}`] ?? {}
            return {
                ...game,
                homeTeamName: names[game.homeTeamId] ?? checkpoint.historicalPlayers.find(player => player.teamId === game.homeTeamId)?.teamName ?? game.homeTeamName,
                awayTeamName: names[game.awayTeamId] ?? checkpoint.historicalPlayers.find(player => player.teamId === game.awayTeamId)?.teamName ?? game.awayTeamName,
            }
        })
        return {
            ok: true,
            snapshot: { games, playerPool: pool, checkedAt: new Date().toISOString() },
            seed: { rosters: checkpoint.rostersBySeasonAndTeam, teamNames: checkpoint.teamNamesBySeason },
        }
    } catch (error) {
        if (error instanceof Error && error.name === 'WorkDeadlineError') return pending()
        return { ok: false, reason: 'SOURCE_UNAVAILABLE' }
    }
}

/**
 * Start times of real games in a source between two dates, read once so the publisher can
 * skip windows without games in every week. Undefined when the schedule could not be read.
 */
export async function contestGameTimes(provider: ISportsProvider, from: Date, to: Date, source: RecurringWindow['sourceSlug'] = 'north-america'): Promise<number[] | undefined> {
    const years = Array.from({ length: to.getUTCFullYear() - from.getUTCFullYear() + 1 }, (_, n) => from.getUTCFullYear() + n)
    const winter = source === 'winter-leagues'
    const seasons = winter ? [...new Set(years.flatMap(year => [year, year - 1]))] : years
    const queries = (winter ? ['winter-leagues' as const] : NORTH_AMERICA_CONTEST_LEAGUES).flatMap(league => seasons.map(season => ({ league, season })))
    const settled = await Promise.allSettled(queries.map(({ league, season }) =>
        provider.getSchedule({ league, season, startDateUtc: from, endDateUtc: to, ...(winter ? {} : { gameTypes: CONTEST_GAME_TYPES }) })))
    if (settled.every(result => result.status === 'rejected')) return undefined
    return settled.flatMap(result => result.status === 'fulfilled'
        ? result.value.filter(game => game.status !== 'CANCELLED').map(game => Date.parse(game.gameDateUtc))
        : [])
}

/** True when every week of the window has at least one game. */
export function windowHasGamesEveryWeek(window: Pick<RecurringWindow, 'startsAt' | 'totalWeeks'>, gameTimes: readonly number[]): boolean {
    const start = window.startsAt.getTime()
    return Array.from({ length: window.totalWeeks }, (_, week) => week).every(week =>
        gameTimes.some(at => at >= start + week * weekMs && at < start + (week + 1) * weekMs))
}
