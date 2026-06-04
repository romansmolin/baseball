import useSWR from 'swr'

import type { MyTeamsPayload } from '@/shared/teams'
import { fetchMyTeams } from './fetch-my-teams'

export function useMyTeamsData() {
    return useSWR<MyTeamsPayload>(['me', 'teams'], () => fetchMyTeams())
}
