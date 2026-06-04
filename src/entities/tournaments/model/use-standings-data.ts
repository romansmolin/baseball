import useSWR from 'swr'

import { fetchTournamentStandings } from '../api/fetch-tournament-standings'

export function useStandingsData(id: string | null) {
    return useSWR(id ? (['tournament', id, 'standings'] as const) : null, () => {
        if (!id) throw new Error('useStandingsData called without an id')
        return fetchTournamentStandings(id)
    })
}
