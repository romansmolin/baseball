import { httpClient } from '@/shared/api/http-client'
import { withErrorHandling } from '@/shared/api/with-error-handling'

import {
    mapJoinTournamentResultToModel,
    mapJoinTournamentToDto,
} from './mappers'
import type {
    JoinTournamentPayload,
    JoinTournamentResult,
    JoinTournamentResultDto,
} from './types'

export const joinTournament = withErrorHandling(
    async (
        tournamentId: string,
        payload: JoinTournamentPayload,
    ): Promise<JoinTournamentResult> => {
        const dto = mapJoinTournamentToDto(payload)
        const result = await httpClient.post<JoinTournamentResultDto>(
            `/api/tournaments/${tournamentId}/join`,
            dto,
        )
        return mapJoinTournamentResultToModel(result)
    },
)
