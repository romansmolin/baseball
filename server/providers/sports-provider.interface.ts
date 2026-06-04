import type { Paginated } from './dto/provider-pagination.dto'
import type { ProviderPlayer, ProviderPlayerFilters } from './dto/provider-player.dto'
import type {
    GetScheduleFilters,
    ProviderBoxScore,
    ProviderScheduledGame,
} from './dto/provider-schedule.dto'
import type { ProviderTeam } from './dto/provider-team.dto'

export type RosterType = 'active' | '40Man' | 'fullSeason'

export interface GetTeamsFilters {
    season?: number
    activeOnly?: boolean
}

export interface GetTeamByIdOptions {
    season?: number
}

export interface GetPlayersByTeamOptions {
    season?: number
    rosterType?: RosterType
}

export interface ISportsProvider {
    readonly name: string
    getTeams(filters?: GetTeamsFilters): Promise<ProviderTeam[]>
    getTeamById(id: number, opts?: GetTeamByIdOptions): Promise<ProviderTeam | null>
    getPlayers(filters?: ProviderPlayerFilters): Promise<Paginated<ProviderPlayer>>
    getPlayerById(id: number): Promise<ProviderPlayer | null>
    getPlayersByTeam(teamId: number, opts?: GetPlayersByTeamOptions): Promise<ProviderPlayer[]>
    getSchedule(filters: GetScheduleFilters): Promise<ProviderScheduledGame[]>
    getBoxScore(gamePk: number): Promise<ProviderBoxScore | null>
}
