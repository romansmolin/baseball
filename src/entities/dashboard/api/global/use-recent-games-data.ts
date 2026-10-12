import useSWR from 'swr'

import { fetchRecentGames } from './fetch-recent-games'

// 1-minute refresh so LIVE scores stay close to real time.
export function useRecentGamesData(limit?: number) {
    return useSWR(['games', 'results', limit ?? 6], () => fetchRecentGames(limit), {
        refreshInterval: 60 * 1000,
    })
}
