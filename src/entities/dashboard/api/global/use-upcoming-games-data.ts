import useSWR from 'swr'

import { fetchUpcomingGames } from './fetch-upcoming-games'

// 5-minute refresh — the upstream MLB schedule moves rarely (only when games
// get postponed or rescheduled), and we don't want to thrash the provider.
export function useUpcomingGamesData(limit?: number, enabled = true) {
    return useSWR(
        enabled ? ['games', 'upcoming', limit ?? 6] : null,
        () => fetchUpcomingGames(limit),
        { refreshInterval: 5 * 60 * 1000 },
    )
}
