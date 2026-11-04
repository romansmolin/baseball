import useSWR from 'swr'

import { fetchDailyStars } from '../api/fetch-daily-stars'

export function useDailyStarsData(limit: number) {
    return useSWR(['stats', 'stars', limit], () => fetchDailyStars(limit))
}
