import { httpClient } from '@/shared/api/http-client'
import { withErrorHandling } from '@/shared/api/with-error-handling'
import type { DailyStars } from '@/shared/stats'

export const fetchDailyStars = withErrorHandling(async (limit: number): Promise<DailyStars> => {
    return httpClient.get<DailyStars>(`/api/performers/stars?limit=${limit}`)
})
