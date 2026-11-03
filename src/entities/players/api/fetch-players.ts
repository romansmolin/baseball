import type { SupportedBaseballLeague } from '@/shared/baseball'
import type { PositionGroup } from '@/shared/sports'
import { httpClient } from '@/shared/api/http-client'
import { withErrorHandling } from '@/shared/api/with-error-handling'

import type { PlayersPage } from '../model/types'
import { mapPlayerDtoToModel } from './map-players'
import type { PlayersListResponseDto } from './types'

export interface FetchPlayersParams {
    league: SupportedBaseballLeague
    search?: string
    limit?: number
    offset?: number
    position?: PositionGroup | 'all'
    status?: 'all' | 'active' | 'out'
}

const DEFAULT_LIMIT = 10

export const fetchPlayers = withErrorHandling(
    async (params: FetchPlayersParams): Promise<PlayersPage> => {
        const search = new URLSearchParams()
        search.set('league', params.league)
        search.set('limit', String(params.limit ?? DEFAULT_LIMIT))
        search.set('offset', String(params.offset ?? 0))
        if (params.position && params.position !== 'all') {
            search.set('positionGroup', params.position)
        }
        if (params.status && params.status !== 'all') {
            search.set('active', String(params.status === 'active'))
        }
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
