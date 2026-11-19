import { httpClient } from '@/shared/api/http-client'
import { withErrorHandling } from '@/shared/api/with-error-handling'
import type { GameLeague } from '@/shared/games'
import type { PerformerDetail, PerformerGroup } from '@/shared/performers'

export interface PerformerTarget {
    playerId: number
    league: GameLeague
    group: PerformerGroup
}

// The server answers with the shared domain model, so there is no separate DTO to map.
export const fetchPerformerAnalytics = withErrorHandling(async (target: PerformerTarget): Promise<PerformerDetail> => {
    const dto = await httpClient.post<{ output: PerformerDetail }>('/api/me/ai/performer-analytics', target)
    return dto.output
})
