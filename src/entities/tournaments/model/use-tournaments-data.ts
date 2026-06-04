import useSWR from 'swr'

import { fetchTournaments, type FetchTournamentsParams } from '../api/fetch-tournaments'

// Stable cache key — includes every filter so SWR refetches when filters change.
const buildKey = (params: FetchTournamentsParams) =>
    [
        'tournaments',
        'list',
        params.leagueSlug ?? null,
        params.status ? [...params.status].sort().join(',') : null,
        params.visibility ? [...params.visibility].sort().join(',') : null,
        params.limit ?? null,
        params.offset ?? null,
    ] as const

export function useTournamentsData(params: FetchTournamentsParams = {}) {
    return useSWR(buildKey(params), () => fetchTournaments(params))
}
