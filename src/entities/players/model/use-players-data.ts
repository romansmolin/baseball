import useSWR from 'swr'

import type { SupportedBaseballLeague } from '@/shared/baseball'

import { fetchPlayers, type FetchPlayersParams } from '../api/fetch-players'

export function usePlayersData(params: FetchPlayersParams & { league: SupportedBaseballLeague }) {
    const trimmed = params.search?.trim() ?? ''
    return useSWR(
        ['players', params.league, trimmed, params.position, params.status, params.offset, params.limit],
        () => fetchPlayers({ ...params, search: trimmed || undefined }),
    )
}
