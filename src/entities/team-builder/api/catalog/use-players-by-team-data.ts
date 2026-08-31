import useSWR from 'swr'

import { fetchPlayersByTeam, type PlayersByTeamFilters } from './fetch-players-by-team'

export function usePlayersByTeamData(filters: PlayersByTeamFilters) {
    const key =
        filters.teamId == null
            ? null
            : ([
                  'catalog',
                  'players',
                  filters.leagueSlug,
                  filters.teamId,
                  filters.search ?? '',
                  filters.position ?? '',
              ] as const)

    return useSWR(key, () => fetchPlayersByTeam(filters))
}
