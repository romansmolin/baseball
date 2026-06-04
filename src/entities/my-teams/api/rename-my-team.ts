import { withErrorHandling } from '@/shared/api/with-error-handling'
import { httpClient } from '@/shared/api/http-client'
import type { Team } from '@/shared/teams'

export const renameMyTeam = withErrorHandling(
    async (teamId: string, name: string): Promise<Team> => {
        return httpClient.patch<Team>(`/api/me/teams/${teamId}`, { name })
    },
)
