import { usePlayerAnalyticsData } from '@/entities/analytics'
import type { ApiError } from '@/shared/api/api-error'

export function usePlayerAnalytics(playerId: number | null) {
    const { data, isLoading, error } = usePlayerAnalyticsData(playerId)
    return {
        analytics: data ?? null,
        isLoading,
        error: error as ApiError | undefined,
    }
}
