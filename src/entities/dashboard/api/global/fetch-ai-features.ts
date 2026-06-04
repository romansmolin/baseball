import { httpClient } from '@/shared/api/http-client'
import type { AIFeature } from '@/shared/dashboard'

export async function fetchAIFeatures(): Promise<AIFeature[]> {
    return httpClient.get<AIFeature[]>('/api/ai/features')
}
