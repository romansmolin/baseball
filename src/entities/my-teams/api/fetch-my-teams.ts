import { httpClient } from '@/shared/api/http-client'
import type { MyTeamsPayload } from '@/shared/teams'

export const fetchMyTeams = async (): Promise<MyTeamsPayload> => {
    return httpClient.get<MyTeamsPayload>('/api/me/teams')
}
