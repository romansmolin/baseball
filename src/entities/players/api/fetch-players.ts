import type { SupportedBaseballLeague } from '@/shared/baseball'
import { httpClient } from '@/shared/api/http-client'
import { withErrorHandling } from '@/shared/api/with-error-handling'

import type { PlayersPage } from '../model/types'
import { mapPlayerDtoToModel } from './map-players'
import type { PlayersListResponseDto } from './types'

export interface FetchPlayersParams {
    league: SupportedBaseballLeague
    search?: string
    // The provider list is large; the page pulls the first slice and leans on
    // search to narrow. Server caps this at 200.
    limit?: number
}

const DEFAULT_LIMIT = 200

export const fetchPlayers = withErrorHandling(
    async (params: FetchPlayersParams): Promise<PlayersPage> => {
        const search = new URLSearchParams()
        search.set('league', params.league)
        search.set('limit', String(params.limit ?? DEFAULT_LIMIT))
        if (params.search?.trim()) search.set('search', params.search.trim())

        const dto = await httpClient.get<PlayersListResponseDto>(
            `/api/players?${search.toString()}`,
        )

        return {
            league: params.league,
            total: dto.total,
            items: dto.items.map((item) => mapPlayerDtoToModel(item, params.league)),
        }
    },
)
