import { httpClient } from '@/shared/api/http-client'
import type { TopPerformer } from '@/shared/dashboard'

export async function fetchTopPerformers(limit?: number): Promise<TopPerformer[]> {
    const query = limit != null ? `?limit=${limit}` : ''
    return httpClient.get<TopPerformer[]>(`/api/performers/top${query}`)
}
