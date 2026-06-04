import { httpClient } from '@/shared/api/http-client'
import { withErrorHandling } from '@/shared/api/with-error-handling'
import type {
    TournamentStatus,
    TournamentVisibility,
    TournamentsListResponse,
} from '@/shared/tournaments'

import { mapTournamentsListToResponse } from './map-tournaments'
import type { TournamentsListDto } from './types'

export interface FetchTournamentsParams {
    leagueSlug?: string
    status?: TournamentStatus[]
    visibility?: TournamentVisibility[]
    limit?: number
    offset?: number
}

export const fetchTournaments = withErrorHandling(
    async (params: FetchTournamentsParams = {}): Promise<TournamentsListResponse> => {
        const search = new URLSearchParams()
        if (params.leagueSlug) search.set('leagueSlug', params.leagueSlug)
        if (params.status && params.status.length > 0) {
            search.set('status', params.status.join(','))
        }
        if (params.visibility && params.visibility.length > 0) {
            search.set('visibility', params.visibility.join(','))
        }
        if (params.limit != null) search.set('limit', String(params.limit))
        if (params.offset != null) search.set('offset', String(params.offset))

        const query = search.toString()
        const url = query ? `/api/tournaments?${query}` : '/api/tournaments'

        const dto = await httpClient.get<TournamentsListDto>(url)
        return mapTournamentsListToResponse(dto)
    },
)
