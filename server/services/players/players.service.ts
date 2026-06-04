import type { Paginated } from '../../providers/dto/provider-pagination.dto'
import type { ProviderPlayer, ProviderPlayerFilters } from '../../providers/dto/provider-player.dto'
import type { ISportsProvider } from '../../providers/sports-provider.interface'
import type { IPlayersService } from './players.service.interface'

export class PlayersService implements IPlayersService {
    private readonly provider: ISportsProvider

    constructor(provider: ISportsProvider) {
        this.provider = provider
    }

    listPlayers(filters?: ProviderPlayerFilters): Promise<Paginated<ProviderPlayer>> {
        return this.provider.getPlayers(filters)
    }

    getPlayerById(id: number): Promise<ProviderPlayer | null> {
        return this.provider.getPlayerById(id)
    }
}
