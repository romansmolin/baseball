import useSWR from 'swr'

import { fetchStandings } from '../api/fetch-standings'

export function useStandingsData(league: string) {
    return useSWR(['stats', 'standings', league], () => fetchStandings(league))
}
