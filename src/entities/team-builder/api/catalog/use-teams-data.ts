import useSWR from 'swr'

import { fetchBuilderTeams } from './fetch-teams'

export function useBuilderTeamsData() {
    return useSWR(['catalog', 'teams'], () => fetchBuilderTeams())
}
