import type { ProviderPlayer } from '../../providers/dto/provider-player.dto'
import type { ProviderTeam } from '../../providers/dto/provider-team.dto'
import type {
    GetPlayersByTeamOptions,
    GetTeamByIdOptions,
    GetTeamsFilters,
    ISportsProvider,
} from '../../providers/sports-provider.interface'
import type { ITeamsService } from './teams.service.interface'

export class TeamsService implements ITeamsService {
    private readonly provider: ISportsProvider

    constructor(provider: ISportsProvider) {
        this.provider = provider
    }

    listTeams(filters?: GetTeamsFilters): Promise<ProviderTeam[]> {
        return this.provider.getTeams(filters)
    }

    getTeamById(id: number, opts?: GetTeamByIdOptions): Promise<ProviderTeam | null> {
        return this.provider.getTeamById(id, opts)
    }

    getTeamRoster(id: number, opts?: GetPlayersByTeamOptions): Promise<ProviderPlayer[]> {
        return this.provider.getPlayersByTeam(id, opts)
    }
}
