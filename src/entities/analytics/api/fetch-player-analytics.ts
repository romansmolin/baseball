import type { PlayerAnalytics } from '@/shared/analytics'
import type { SupportedBaseballLeague } from '@/shared/baseball'
import { httpClient } from '@/shared/api/http-client'
import { withErrorHandling } from '@/shared/api/with-error-handling'

// The server answers with the shared domain model, so there is no separate DTO to map.
export const fetchPlayerAnalytics = withErrorHandling(
    async (playerId: number, season?: number, league?: SupportedBaseballLeague): Promise<PlayerAnalytics> => {
        const params = new URLSearchParams()
        if (season) params.set('season', String(season))
        if (league) params.set('league', league)
        const query = params.size > 0 ? `?${params.toString()}` : ''
        return httpClient.get<PlayerAnalytics>(`/api/players/${playerId}/analytics${query}`)
    },
)
