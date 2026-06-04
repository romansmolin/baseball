import { httpClient } from '@/shared/api/http-client'
import { withErrorHandling } from '@/shared/api/with-error-handling'
import type { UpdateLineupPayload } from '@/shared/team-builder'
import type { Team } from '@/shared/teams'

export const updateTeamLineup = withErrorHandling(
    async (teamId: string, payload: UpdateLineupPayload): Promise<Team> => {
        return httpClient.put<Team>(`/api/me/teams/${teamId}/lineup`, payload)
    },
)
