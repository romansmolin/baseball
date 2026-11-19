import type { BaseballProviderLeague } from '../../src/shared/baseball'

import type { Paginated } from './dto/provider-pagination.dto'
import type { ProviderGameContext } from './dto/provider-game-context.dto'
import type { ProviderPlayerProfile } from './dto/provider-player-profile.dto'
import type { ProviderPlayer, ProviderPlayerFilters } from './dto/provider-player.dto'
import type {
    GetScheduleFilters,
    ProviderBoxScore,
    ProviderScheduledGame,
} from './dto/provider-schedule.dto'
import type { ProviderTeamStanding } from './dto/provider-team-standing.dto'
import type { ProviderTeam } from './dto/provider-team.dto'

export type RosterType = 'active' | '40Man' | 'fullSeason'

// Every read is scoped to a single baseball league. When `league` is omitted
// the provider falls back to MLB, so all pre-existing callers keep working
// unchanged.
export interface GetTeamsFilters {
    season?: number
    activeOnly?: boolean
    league?: BaseballProviderLeague
}

export interface GetTeamByIdOptions {
    season?: number
    league?: BaseballProviderLeague
}

export interface GetPlayersByTeamOptions {
    season?: number
    rosterType?: RosterType
    league?: BaseballProviderLeague
    // Also load each player's stats for this season. Rosters still come back if the stats cannot be read.
    statsSeason?: number
}

export interface GetBoxScoreOptions {
    deadline?: number
    league?: BaseballProviderLeague
}

export interface ISportsProvider {
    readonly name: string
    getTeams(filters?: GetTeamsFilters): Promise<ProviderTeam[]>
    getTeamById(id: number, opts?: GetTeamByIdOptions): Promise<ProviderTeam | null>
    getPlayers(filters?: ProviderPlayerFilters): Promise<Paginated<ProviderPlayer>>
    getPlayerById(id: number): Promise<ProviderPlayer | null>
    getPlayersByIds(ids: number[]): Promise<ProviderPlayer[]>
    getPlayersByTeam(teamId: number, opts?: GetPlayersByTeamOptions): Promise<ProviderPlayer[]>
    getSchedule(filters: GetScheduleFilters): Promise<ProviderScheduledGame[]>
    // Splits, game log, sabermetrics and roster status for one season; null when the player is unknown.
    getPlayerProfile(id: number, season: number): Promise<ProviderPlayerProfile | null>
    // Schedule enriched with probable pitchers, weather, venue, records and lineup status.
    getGameContexts(filters: GetScheduleFilters): Promise<ProviderGameContext[]>
    // One game by id, looked up at the level of its league (MLB by default), with the same enrichment; null when the schedule has no such game.
    getGameContext(gamePk: number, season?: number, league?: BaseballProviderLeague): Promise<ProviderGameContext | null>
    // MLB regular-season standings: record and last ten games for every team.
    getTeamStandings(season: number): Promise<ProviderTeamStanding[]>
    getBoxScore(gamePk: number, opts?: GetBoxScoreOptions): Promise<ProviderBoxScore | null>
}
