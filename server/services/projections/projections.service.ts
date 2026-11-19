import type { ProviderPlayer } from '../../providers/dto/provider-player.dto'
import type { ISportsProvider } from '../../providers/sports-provider.interface'
import type { ForecastPeriod } from '../../../src/shared/team-builder'

import { projectPlayerPoints } from './project-points'
import type {
    IProjectionsService,
    ProjectTeamsInput,
    ProjectTeamsResult,
} from './projections.service.interface'
import type { Projection } from './projections.type'

// Typical games per team when the schedule has none (off-season): the
// projection then runs on season pace instead of leaving the pool empty.
const SEASON_PACE_GAMES: Record<ForecastPeriod, number> = { DAY: 1, WEEK: 6, SEASON: 162 }
const MS_PER_DAY = 24 * 60 * 60 * 1000

function periodWindow(period: ForecastPeriod, now: Date): { start: Date; end: Date } {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    if (period === 'DAY') return { start, end: start }
    if (period === 'WEEK') return { start, end: new Date(start.getTime() + 6 * MS_PER_DAY) }
    return { start, end: new Date(Date.UTC(now.getUTCFullYear(), 8, 30)) }
}

const hasStats = (player: ProviderPlayer) =>
    Object.keys(player.battingStats ?? {}).length > 0 || Object.keys(player.pitchingStats ?? {}).length > 0

export class ProjectionsService implements IProjectionsService {
    private readonly provider: ISportsProvider

    constructor(provider: ISportsProvider) {
        this.provider = provider
    }

    async projectTeams(input: ProjectTeamsInput): Promise<ProjectTeamsResult> {
        const { league, period, rules } = input
        const now = input.now ?? new Date()
        const playerIds = input.playerIds ?? []
        const lineupPlayers = playerIds.length > 0 ? await this.provider.getPlayersByIds(playerIds).catch(() => []) : []
        const teamIds = [
            ...new Set([
                ...input.teamIds,
                ...lineupPlayers.flatMap((player) => (player.teamId != null ? [player.teamId] : [])),
            ]),
        ]
        const season = now.getUTCFullYear()

        const { players, statsSeason } = await this.loadPlayers(teamIds, season, league)
        const { start, end } = periodWindow(period, now)

        const scheduled = await this.provider
            .getSchedule({ startDateUtc: start, endDateUtc: end, teamIds, league, season, gameTypes: 'R' })
            .catch(() => [])
        const live = scheduled.filter((game) => game.status !== 'CANCELLED' && game.status !== 'POSTPONED')
        const gamesByTeam = new Map<number, number>()
        for (const game of live) {
            for (const id of [game.homeTeamId, game.awayTeamId]) {
                gamesByTeam.set(id, (gamesByTeam.get(id) ?? 0) + 1)
            }
        }
        const basis = live.length > 0 ? 'schedule' : 'season-pace'

        const announced =
            basis === 'schedule' && period !== 'SEASON'
                ? await this.announcedStarts(start, end, teamIds, league, season)
                : null
        // Standings must come from the season the stats came from.
        const seasonGames = await this.teamSeasonGames(statsSeason, league)

        const projections: Record<number, Projection> = {}
        for (const player of players) {
            const teamGames =
                basis === 'schedule' ? (gamesByTeam.get(player.teamId ?? -1) ?? 0) : SEASON_PACE_GAMES[period]
            projections[player.id] = projectPlayerPoints({
                player,
                teamGames,
                basis,
                teamSeasonGames: seasonGames.get(player.teamId ?? -1) ?? null,
                announcedStarts: announced ? (announced.byPitcher.get(player.id) ?? 0) : undefined,
                unannouncedTeamGames: announced
                    ? Math.max(0, teamGames - (announced.byTeam.get(player.teamId ?? -1) ?? 0))
                    : undefined,
                rules,
            })
        }

        return { basis, projections, players }
    }

    // One failed team must not block the others. Falls back to last season's
    // stats when the current season has none yet.
    private async loadPlayers(
        teamIds: number[],
        season: number,
        league: ProjectTeamsInput['league'],
    ): Promise<{ players: ProviderPlayer[]; statsSeason: number }> {
        const load = async (statsSeason: number) => {
            const rosters = await Promise.all(
                teamIds.map((id) =>
                    this.provider.getPlayersByTeam(id, { league, statsSeason }).catch(() => [] as ProviderPlayer[]),
                ),
            )
            const byId = new Map<number, ProviderPlayer>()
            for (const player of rosters.flat()) if (!byId.has(player.id)) byId.set(player.id, player)
            return [...byId.values()]
        }
        const current = await load(season)
        if (current.some(hasStats)) return { players: current, statsSeason: season }
        return { players: await load(season - 1), statsSeason: season - 1 }
    }

    // Per pitcher: announced starts. Per team: games that already have a probable starter.
    // null when the contexts cannot be loaded (the rotation estimate then stands).
    private async announcedStarts(
        start: Date,
        end: Date,
        teamIds: number[],
        league: ProjectTeamsInput['league'],
        season: number,
    ): Promise<{ byPitcher: Map<number, number>; byTeam: Map<number, number> } | null> {
        try {
            const contexts = await this.provider.getGameContexts({
                startDateUtc: start, endDateUtc: end, teamIds, league, season, gameTypes: 'R',
            })
            const byPitcher = new Map<number, number>()
            const byTeam = new Map<number, number>()
            for (const { game, probablePitchers } of contexts) {
                const sides = [
                    { pitcher: probablePitchers.home, teamId: game.homeTeamId },
                    { pitcher: probablePitchers.away, teamId: game.awayTeamId },
                ]
                for (const { pitcher, teamId } of sides) {
                    if (!pitcher) continue
                    byPitcher.set(pitcher.id, (byPitcher.get(pitcher.id) ?? 0) + 1)
                    byTeam.set(teamId, (byTeam.get(teamId) ?? 0) + 1)
                }
            }
            return { byPitcher, byTeam }
        } catch {
            return null
        }
    }

    private async teamSeasonGames(season: number, league: ProjectTeamsInput['league']): Promise<Map<number, number>> {
        if (league && league !== 'mlb') return new Map()
        const standings = await this.provider.getTeamStandings(season).catch(() => [])
        return new Map(standings.map((row) => [row.teamId, row.wins + row.losses]))
    }
}
