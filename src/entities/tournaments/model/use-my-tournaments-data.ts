import useSWR from 'swr'

import { fetchMyTournaments } from '../api/fetch-my-tournaments'

export function useMyTournamentsData(enabled = true) {
    return useSWR(enabled ? ['me', 'tournaments'] : null, () => fetchMyTournaments())
}
