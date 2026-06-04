import { httpClient } from '@/shared/api/http-client'
import type { UpcomingGameRecord } from '@/shared/games'

export async function fetchUpcomingGames(limit?: number): Promise<UpcomingGameRecord[]> {
    const query = limit != null ? `?limit=${limit}` : ''
    return httpClient.get<UpcomingGameRecord[]>(`/api/games/upcoming${query}`)
}
