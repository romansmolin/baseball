import { withErrorHandling } from '@/shared/api/with-error-handling'
import { httpClient } from '@/shared/api/http-client'
import type { UpcomingGameRecord } from '@/shared/games'

export const fetchRecentGames = withErrorHandling(
    async (limit?: number): Promise<UpcomingGameRecord[]> => {
        const query = limit != null ? `?limit=${limit}` : ''
        return httpClient.get<UpcomingGameRecord[]>(`/api/games/results${query}`)
    },
)
