import type { GameDetail } from '@/shared/analytics'
import { httpClient } from '@/shared/api/http-client'
import { withErrorHandling } from '@/shared/api/with-error-handling'

export const fetchGameDetail = withErrorHandling(
    async (gamePk: number): Promise<GameDetail> =>
        httpClient.get<GameDetail>(`/api/games/${gamePk}`),
)
