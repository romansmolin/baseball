import { httpClient } from '@/shared/api/http-client'
import { withErrorHandling } from '@/shared/api/with-error-handling'
import type { TournamentRecord } from '@/shared/tournaments'

import { mapTournamentToRecord } from './map-tournaments'
import type { TournamentDto } from './types'

export const fetchMyTournaments = withErrorHandling(
    async (): Promise<TournamentRecord[]> => {
        const dtos = await httpClient.get<TournamentDto[]>('/api/me/tournaments')
        return dtos.map(mapTournamentToRecord)
    },
)
