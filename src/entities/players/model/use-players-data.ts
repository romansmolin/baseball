import useSWR from 'swr'

import type { SupportedBaseballLeague } from '@/shared/baseball'

import { fetchPlayers } from '../api/fetch-players'

export function usePlayersData(league: SupportedBaseballLeague, search: string) {
    const trimmed = search.trim()
    return useSWR(['players', league, trimmed], () =>
        fetchPlayers({ league, search: trimmed || undefined }),
    )
}
