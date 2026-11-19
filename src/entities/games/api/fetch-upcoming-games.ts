import { httpClient } from '@/shared/api/http-client'
import { withErrorHandling } from '@/shared/api/with-error-handling'
import type { UpcomingGameRecord } from '@/shared/games'

export const fetchUpcomingGames = withErrorHandling(
    async (limit?: number, days?: number): Promise<UpcomingGameRecord[]> => {
        const params = new URLSearchParams()
        if (limit != null) params.set('limit', String(limit))
        if (days != null) params.set('days', String(days))
        const query = params.size > 0 ? `?${params}` : ''
        return httpClient.get<UpcomingGameRecord[]>(`/api/games/upcoming${query}`)
    },
)
