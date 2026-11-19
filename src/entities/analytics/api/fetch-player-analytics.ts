import type { PlayerAnalytics } from '@/shared/analytics'
import { httpClient } from '@/shared/api/http-client'
import { withErrorHandling } from '@/shared/api/with-error-handling'

// The server answers with the shared domain model, so there is no separate DTO to map.
export const fetchPlayerAnalytics = withErrorHandling(
    async (playerId: number, season?: number): Promise<PlayerAnalytics> => {
        const query = season ? `?season=${season}` : ''
        return httpClient.get<PlayerAnalytics>(`/api/players/${playerId}/analytics${query}`)
    },
)
