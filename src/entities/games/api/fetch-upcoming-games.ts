import { httpClient } from '@/shared/api/http-client'
import { withErrorHandling } from '@/shared/api/with-error-handling'
import type { UpcomingGameRecord } from '@/shared/games'

export const fetchUpcomingGames = withErrorHandling(
    async (limit?: number): Promise<UpcomingGameRecord[]> => {
        const query = limit != null ? `?limit=${limit}` : ''
        return httpClient.get<UpcomingGameRecord[]>(`/api/games/upcoming${query}`)
    },
)
