import type { Paginated } from '../../providers/dto/provider-pagination.dto'
import type { ProviderPlayer, ProviderPlayerFilters } from '../../providers/dto/provider-player.dto'

export interface IPlayersService {
    listPlayers(filters?: ProviderPlayerFilters): Promise<Paginated<ProviderPlayer>>
    getPlayerById(id: number): Promise<ProviderPlayer | null>
}
