import { httpClient } from '@/shared/api/http-client'
import { withErrorHandling } from '@/shared/api/with-error-handling'
import type { TournamentStandingsResponse } from '@/shared/tournaments'

import { mapStandingsToResponse } from './map-tournaments'
import type { TournamentStandingsDto } from './types'

export const fetchTournamentStandings = withErrorHandling(
    async (id: string): Promise<TournamentStandingsResponse> => {
        const dto = await httpClient.get<TournamentStandingsDto>(
            `/api/tournaments/${id}/standings`,
        )
        return mapStandingsToResponse(dto)
    },
)
