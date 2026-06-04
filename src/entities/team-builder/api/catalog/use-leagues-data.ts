import useSWR from 'swr'

import { fetchLeagues } from './fetch-leagues'

export function useLeaguesData() {
    return useSWR(['catalog', 'leagues'], () => fetchLeagues())
}
