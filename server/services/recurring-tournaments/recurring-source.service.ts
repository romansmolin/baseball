import type { ISportsProvider } from '../../providers/sports-provider.interface'
import type { DailyPlayer } from '@/shared/daily-contests'
import { providerPositionToPoolPosition } from '@/shared/team-builder'
import { canPublishPool } from '../daily-contests/daily-rules'
import type { RecurringGame, RecurringSourceSnapshot, RecurringWindow } from './recurring.types'

export interface SourceCheckpoint {
    windowKey: string
    phase: 'SCHEDULE' | 'ROSTERS' | 'BOX_SCORES' | 'VERIFY'
    offset: number
    games: RecurringGame[]
    rostersBySeasonAndTeam: Record<string, DailyPlayer[]>
    teamNamesBySeason: Record<string, Record<string, string>>
    historicalGamePks: number[]
    historicalPlayers: DailyPlayer[]
}
export type SourceInspection = { ok: true; snapshot: RecurringSourceSnapshot }
    | { ok: false; reason: 'SOURCE_UNAVAILABLE' | 'EMPTY_WEEK' | 'INVALID_POOL' }
    | { ok: false; reason: 'INCOMPLETE_BATCH'; checkpoint: SourceCheckpoint }

const weekMs = 7 * 86400000
const acceptedPositions = new Set(['P', 'SP', 'RP', 'C', '1B', '2B', '3B', 'SS', 'OF', 'LF', 'CF', 'RF', 'DH'])

export async function inspectRecurringSource(provider: ISportsProvider, window: RecurringWindow, options: { historical: boolean; checkpoint?: SourceCheckpoint; deadline?: number }): Promise<SourceInspection> {
    const key = `${window.templateKey}:${window.sourceSlug}:${window.startsAt.toISOString()}:${window.endsAt.toISOString()}:${options.historical}`
    if (options.checkpoint && options.checkpoint.windowKey !== key) throw new Error('Source checkpoint belongs to a different window')
    const checkpoint: SourceCheckpoint = options.checkpoint ? structuredClone(options.checkpoint) : { windowKey: key, phase: 'SCHEDULE', offset: 0, games: [], rostersBySeasonAndTeam: {}, teamNamesBySeason: {}, historicalGamePks: [], historicalPlayers: [] }
    const pending = (): SourceInspection => ({ ok: false, reason: 'INCOMPLETE_BATCH', checkpoint })
    const timeLeft = () => options.deadline === undefined || Date.now() + 500 < options.deadline
    const years = Array.from({ length: window.endsAt.getUTCFullYear() - window.startsAt.getUTCFullYear() + 1 }, (_, n) => window.startsAt.getUTCFullYear() + n)
    const seasons = [...new Set(years.flatMap(y => [y, y - 1]))].sort((a, b) => b - a)
    try {
        if (checkpoint.phase === 'SCHEDULE') {
            for (; checkpoint.offset < seasons.length; checkpoint.offset++) {
                if (!timeLeft()) return pending()
                const season = seasons[checkpoint.offset]
                const games = await provider.getSchedule({ league: window.sourceSlug, season, startDateUtc: window.startsAt, endDateUtc: window.endsAt })
                const seen = new Set(checkpoint.games.map(g => g.gamePk))
                for (const game of games) {
                    const at = new Date(game.gameDateUtc)
                    if (at < window.startsAt || at >= window.endsAt || game.status === 'CANCELLED' || seen.has(game.gamePk)) continue
                    seen.add(game.gamePk)
                    checkpoint.games.push({ ...game, originalStartUtc: game.gameDateUtc, apiSeason: season, week: Math.floor((at.getTime() - window.startsAt.getTime()) / weekMs) + 1, homeTeamName: `Club ${game.homeTeamId}`, awayTeamName: `Club ${game.awayTeamId}` })
                }
            }
            checkpoint.games.sort((a, b) => Date.parse(a.originalStartUtc) - Date.parse(b.originalStartUtc) || a.gamePk - b.gamePk)
            checkpoint.phase = 'ROSTERS'; checkpoint.offset = 0
        }

        const rosterGames = checkpoint.games.filter(g => !options.historical || g.status !== 'FINAL')
        const teams = [...new Map(rosterGames.flatMap(g => [g.homeTeamId, g.awayTeamId].map(id => [`${g.apiSeason}:${id}`, { id, season: g.apiSeason }] as const))).entries()]
        if (checkpoint.phase === 'ROSTERS') {
            for (; checkpoint.offset < teams.length; checkpoint.offset++) {
                if (!timeLeft()) return pending()
                const [teamKey, team] = teams[checkpoint.offset]
                if (!checkpoint.teamNamesBySeason[team.season]) {
                    const names = await provider.getTeams({ league: window.sourceSlug, season: team.season })
                    checkpoint.teamNamesBySeason[team.season] = Object.fromEntries(names.map(t => [String(t.id), t.name]))
                    if (!timeLeft()) return pending()
                }
                try {
                    const players = await provider.getPlayersByTeam(team.id, { league: window.sourceSlug, season: team.season })
                    checkpoint.rostersBySeasonAndTeam[teamKey] = players.filter(p => acceptedPositions.has(p.primaryPosition)).map(p => ({ externalPlayerId: p.id, name: p.fullName, position: providerPositionToPoolPosition(p.primaryPosition), teamId: team.id, teamName: p.teamName ?? checkpoint.teamNamesBySeason[team.season][team.id] ?? `Club ${team.id}`, salary: 4000 + (p.id % 7) * 1000, photoUrl: p.photoUrl }))
                } catch (error) {
                    if (error instanceof Error && error.name === 'WorkDeadlineError') throw error
                    checkpoint.rostersBySeasonAndTeam[teamKey] = []
                }
            }
            checkpoint.phase = 'BOX_SCORES'; checkpoint.offset = 0
        }

        if (checkpoint.phase === 'BOX_SCORES') {
            const historical = options.historical ? checkpoint.games.filter(g => g.status === 'FINAL') : []
            for (; checkpoint.offset < historical.length; checkpoint.offset++) {
                if (!timeLeft()) return pending()
                const game = historical[checkpoint.offset]
                const roster = await provider.getGameRoster?.(game.gamePk, { league: window.sourceSlug, deadline: options.deadline })
                const box = await provider.getBoxScore(game.gamePk, { league: window.sourceSlug, deadline: options.deadline })
                if (!roster?.players.length || !box?.batters.length || !box.pitchers.length) return { ok: false, reason: 'SOURCE_UNAVAILABLE' }
                checkpoint.historicalGamePks.push(game.gamePk)
                checkpoint.historicalPlayers.push(...roster.players.map(p => ({ ...p, salary: 4000 + (p.externalPlayerId % 7) * 1000 })))
            }
            checkpoint.phase = 'VERIFY'; checkpoint.offset = 0
        }

        const historicalIds = new Set(checkpoint.historicalGamePks)
        const eligible = checkpoint.games.filter(g => historicalIds.has(g.gamePk) || (checkpoint.rostersBySeasonAndTeam[`${g.apiSeason}:${g.homeTeamId}`]?.length && checkpoint.rostersBySeasonAndTeam[`${g.apiSeason}:${g.awayTeamId}`]?.length))
        for (let week = 1; week <= window.totalWeeks; week++) if (!eligible.some(g => g.week === week)) return { ok: false, reason: 'EMPTY_WEEK' }
        const teamKeys = new Set(eligible.filter(g => !historicalIds.has(g.gamePk)).flatMap(g => [`${g.apiSeason}:${g.homeTeamId}`, `${g.apiSeason}:${g.awayTeamId}`]))
        const candidates = [...checkpoint.historicalPlayers, ...[...teamKeys].flatMap(k => checkpoint.rostersBySeasonAndTeam[k] ?? [])]
        const pool = [...new Map(candidates.map(p => [p.externalPlayerId, p])).values()]
        if (!canPublishPool(pool, 80000)) return { ok: false, reason: 'INVALID_POOL' }
        const games = eligible.map(g => ({ ...g, homeTeamName: checkpoint.teamNamesBySeason[g.apiSeason]?.[g.homeTeamId] ?? checkpoint.historicalPlayers.find(p => p.teamId === g.homeTeamId)?.teamName ?? g.homeTeamName, awayTeamName: checkpoint.teamNamesBySeason[g.apiSeason]?.[g.awayTeamId] ?? checkpoint.historicalPlayers.find(p => p.teamId === g.awayTeamId)?.teamName ?? g.awayTeamName }))
        return { ok: true, snapshot: { games, playerPool: pool, checkedAt: new Date().toISOString() } }
    } catch (error) {
        if (error instanceof Error && error.name === 'WorkDeadlineError') throw error
        return { ok: false, reason: 'SOURCE_UNAVAILABLE' }
    }
}
