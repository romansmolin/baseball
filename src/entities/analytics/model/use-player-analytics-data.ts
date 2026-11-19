import useSWR from 'swr'

import { fetchPlayerAnalytics } from '../api/fetch-player-analytics'

import { playerAnalyticsKey } from './analytics-keys'

export function usePlayerAnalyticsData(playerId: number | null, season?: number) {
    const key = playerAnalyticsKey(playerId, season)
    return useSWR(key, () => fetchPlayerAnalytics(key![2], season))
}
