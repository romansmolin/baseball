import { httpClient } from '@/shared/api/http-client'
import type { BuilderLeague } from '@/shared/team-builder'

export async function fetchLeagues(): Promise<BuilderLeague[]> {
    return httpClient.get<BuilderLeague[]>('/api/leagues')
}
