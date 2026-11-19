import useSWR from 'swr'

import { fetchWeeklyPerformers } from '../api/fetch-weekly-performers'

// 15-minute refresh — a rolling 7-day window barely moves within a quarter hour.
export function useWeeklyPerformersData(limit: number) {
    return useSWR(['performers', 'weekly', limit], () => fetchWeeklyPerformers(limit), {
        refreshInterval: 15 * 60 * 1000,
    })
}
