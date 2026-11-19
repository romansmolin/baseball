import { httpClient } from '@/shared/api/http-client'
import { withErrorHandling } from '@/shared/api/with-error-handling'

import type { GamePicks } from '../model/types'

import { mapGamePicksResponseToModel } from './mappers'
import type { GamePicksResponseDto } from './types'

export interface FetchGamePicksParams {
    gamePk: number
    teamId?: string
    scoringPreset?: 'POINTS' | 'CATEGORIES_5X5'
}

export const fetchGamePicks = withErrorHandling(
    async (params: FetchGamePicksParams): Promise<GamePicks> => {
        const dto = await httpClient.post<GamePicksResponseDto>('/api/me/ai/game-picks', params)
        return mapGamePicksResponseToModel(dto)
    },
)
