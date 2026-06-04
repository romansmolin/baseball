import { httpClient } from '@/shared/api/http-client'
import type { CreateTeamPayload, CreateTeamResult } from '@/shared/team-builder'

export const createTeam = (payload: CreateTeamPayload): Promise<CreateTeamResult> =>
    httpClient.post<CreateTeamResult>('/api/me/teams', payload)
