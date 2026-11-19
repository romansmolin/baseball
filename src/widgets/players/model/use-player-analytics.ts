import { usePlayerAnalyticsData } from '@/entities/analytics'
import type { ApiError } from '@/shared/api/api-error'
import type { SupportedBaseballLeague } from '@/shared/baseball'

export function usePlayerAnalytics(playerId: number | null, league?: SupportedBaseballLeague) {
    const { data, isLoading, error } = usePlayerAnalyticsData(playerId, undefined, league)
    return {
        analytics: data ?? null,
        isLoading,
        error: error as ApiError | undefined,
    }
}
