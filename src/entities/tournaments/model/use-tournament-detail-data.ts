import useSWR from 'swr'

import { fetchTournamentById } from '../api/fetch-tournament-by-id'

export function useTournamentDetailData(id: string | null) {
    return useSWR(id ? (['tournament', id] as const) : null, () => {
        if (!id) throw new Error('useTournamentDetailData called without an id')
        return fetchTournamentById(id)
    })
}
