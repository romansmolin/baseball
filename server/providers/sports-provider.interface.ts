import type { BaseballProviderLeague } from '../../src/shared/baseball'

import type { Paginated } from './dto/provider-pagination.dto'
import type { ProviderPlayer, ProviderPlayerFilters } from './dto/provider-player.dto'
import type {
    GetScheduleFilters,
    ProviderBoxScore,
    ProviderScheduledGame,
} from './dto/provider-schedule.dto'
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
}

export interface GetBoxScoreOptions {
    deadline?: number
    league?: BaseballProviderLeague
}

export interface ProviderGameRoster { gamePk: number; players: import('../../src/shared/daily-contests').DailyPlayer[] }

export interface ISportsProvider {
    getGameRoster?(gamePk: number, opts?: GetBoxScoreOptions): Promise<ProviderGameRoster | null>
    readonly name: string
    getTeams(filters?: GetTeamsFilters): Promise<ProviderTeam[]>
    getTeamById(id: number, opts?: GetTeamByIdOptions): Promise<ProviderTeam | null>
    getPlayers(filters?: ProviderPlayerFilters): Promise<Paginated<ProviderPlayer>>
    getPlayerById(id: number): Promise<ProviderPlayer | null>
    getPlayersByIds(ids: number[]): Promise<ProviderPlayer[]>
    getPlayersByTeam(teamId: number, opts?: GetPlayersByTeamOptions): Promise<ProviderPlayer[]>
    getSchedule(filters: GetScheduleFilters): Promise<ProviderScheduledGame[]>
    getBoxScore(gamePk: number, opts?: GetBoxScoreOptions): Promise<ProviderBoxScore | null>
}
