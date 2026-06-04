import type { ProviderTeam } from '../../providers/dto/provider-team.dto'
import type {
    GetPlayersByTeamOptions,
    GetTeamByIdOptions,
    GetTeamsFilters,
} from '../../providers/sports-provider.interface'
import type { ProviderPlayer } from '../../providers/dto/provider-player.dto'

export interface ITeamsService {
    listTeams(filters?: GetTeamsFilters): Promise<ProviderTeam[]>
    getTeamById(id: number, opts?: GetTeamByIdOptions): Promise<ProviderTeam | null>
    getTeamRoster(id: number, opts?: GetPlayersByTeamOptions): Promise<ProviderPlayer[]>
}
