'use client'

import useSWR from 'swr'

import { httpClient } from '@/shared/api/http-client'
import { withErrorHandling } from '@/shared/api/with-error-handling'
import type { UserTournamentProgress } from '@/shared/tournaments'

const fetchUserTournamentProgress = withErrorHandling(
    async (tournamentId: string): Promise<UserTournamentProgress> => {
        return httpClient.get<UserTournamentProgress>(
            `/api/me/tournaments/${tournamentId}`,
        )
    },
)

export function useUserTournamentProgressData(tournamentId: string) {
    return useSWR<UserTournamentProgress>(
        ['tournaments', 'progress', tournamentId],
        () => fetchUserTournamentProgress(tournamentId),
        { shouldRetryOnError: false },
    )
}
