import { httpClient } from '@/shared/api/http-client'
import { withErrorHandling } from '@/shared/api/with-error-handling'
import type { WeeklyTopPerformers } from '@/shared/performers'

export const fetchWeeklyPerformers = withErrorHandling(
    async (limit: number): Promise<WeeklyTopPerformers> =>
        httpClient.get<WeeklyTopPerformers>(`/api/performers/weekly?limit=${limit}`),
)
