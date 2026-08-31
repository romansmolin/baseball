import useSWR from 'swr'

import { fetchBuilderTeams } from './fetch-teams'

// Null league slug disables the fetch (no league picked yet).
export function useBuilderTeamsData(leagueSlug: string | null) {
    return useSWR(
        leagueSlug ? ['catalog', 'teams', leagueSlug] : null,
        () => fetchBuilderTeams(leagueSlug as string),
    )
}
