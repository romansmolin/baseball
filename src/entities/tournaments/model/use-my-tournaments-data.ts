import useSWR from 'swr'

import { fetchMyTournaments } from '../api/fetch-my-tournaments'

export function useMyTournamentsData() {
    return useSWR(['me', 'tournaments'], () => fetchMyTournaments())
}
