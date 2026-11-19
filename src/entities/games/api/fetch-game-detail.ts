import type { GameDetail } from '@/shared/analytics'
import type { GameLeague } from '@/shared/games'
import { httpClient } from '@/shared/api/http-client'
import { withErrorHandling } from '@/shared/api/with-error-handling'

export const fetchGameDetail = withErrorHandling(
    async (gamePk: number, league: GameLeague = 'mlb'): Promise<GameDetail> =>
        httpClient.get<GameDetail>(`/api/games/${gamePk}?league=${league}`),
)
