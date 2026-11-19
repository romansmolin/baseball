import type { CompareResult } from '@/shared/analytics'
import { httpClient } from '@/shared/api/http-client'
import { withErrorHandling } from '@/shared/api/with-error-handling'

export const fetchCompare = withErrorHandling(
    async (playerIds: number[]): Promise<CompareResult> =>
        httpClient.get<CompareResult>(`/api/players/compare?ids=${playerIds.join(',')}`),
)
