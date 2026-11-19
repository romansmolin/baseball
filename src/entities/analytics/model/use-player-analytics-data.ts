import useSWR from 'swr'

import type { SupportedBaseballLeague } from '@/shared/baseball'

import { fetchPlayerAnalytics } from '../api/fetch-player-analytics'

import { playerAnalyticsKey } from './analytics-keys'

export function usePlayerAnalyticsData(playerId: number | null, season?: number, league?: SupportedBaseballLeague) {
    const key = playerAnalyticsKey(playerId, season, league)
    return useSWR(key, () => fetchPlayerAnalytics(key![2], season, league))
}
