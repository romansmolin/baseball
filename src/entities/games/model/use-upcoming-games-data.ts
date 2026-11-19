import useSWR from 'swr'

import { fetchUpcomingGames } from '../api/fetch-upcoming-games'

// 5-minute refresh — the upstream MLB schedule moves rarely (only when games
// get postponed or rescheduled), and we don't want to thrash the provider.
export function useUpcomingGamesData(limit?: number, enabled = true, days?: number) {
    return useSWR(
        enabled ? ['games', 'upcoming', limit ?? 6, days ?? null] : null,
        () => fetchUpcomingGames(limit, days),
        { refreshInterval: 5 * 60 * 1000 },
    )
}
