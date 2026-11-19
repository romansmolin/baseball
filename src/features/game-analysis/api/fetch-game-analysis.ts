import { httpClient } from '@/shared/api/http-client'
import { withErrorHandling } from '@/shared/api/with-error-handling'

import type { GameAnalysis } from '../model/types'

import { mapGameAnalysisResponseToModel } from './mappers'
import type { GameAnalysisResponseDto } from './types'

export const fetchGameAnalysis = withErrorHandling(async (gamePk: number, league: string): Promise<GameAnalysis> => {
    const dto = await httpClient.post<GameAnalysisResponseDto>('/api/me/ai/game-analysis', { gamePk, league })
    return mapGameAnalysisResponseToModel(dto)
})
