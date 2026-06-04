import useSWR from 'swr'

import { fetchUpcomingGames } from './fetch-upcoming-games'

// 5-minute refresh — the upstream MLB schedule moves rarely (only when games
// get postponed or rescheduled), and we don't want to thrash the provider.
export function useUpcomingGamesData(limit?: number) {
    return useSWR(
        ['games', 'upcoming', limit ?? 6],
        () => fetchUpcomingGames(limit),
        { refreshInterval: 5 * 60 * 1000 },
    )
}
