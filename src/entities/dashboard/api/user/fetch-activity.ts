import { httpClient } from '@/shared/api/http-client'
import type { ActivityEvent } from '@/shared/dashboard'

export const fetchActivity = async (limit?: number): Promise<ActivityEvent[]> => {
    const query = limit !== undefined ? `?limit=${limit}` : ''
    return httpClient.get<ActivityEvent[]>(`/api/me/activity${query}`)
}
