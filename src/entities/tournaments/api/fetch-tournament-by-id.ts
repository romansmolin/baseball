import { httpClient } from '@/shared/api/http-client'
import { withErrorHandling } from '@/shared/api/with-error-handling'
import type { TournamentRecord } from '@/shared/tournaments'

import { mapTournamentToRecord } from './map-tournaments'
import type { TournamentDto } from './types'

export const fetchTournamentById = withErrorHandling(
    async (id: string): Promise<TournamentRecord> => {
        const dto = await httpClient.get<TournamentDto>(`/api/tournaments/${id}`)
        return mapTournamentToRecord(dto)
    },
)
