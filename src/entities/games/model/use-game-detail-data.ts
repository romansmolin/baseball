import useSWR from 'swr'

import type { GameLeague } from '@/shared/games'

import { fetchGameDetail } from '../api/fetch-game-detail'

export function useGameDetailData(gamePk: number, league: GameLeague = 'mlb') {
    return useSWR(['games', 'detail', league, gamePk], () => fetchGameDetail(gamePk, league), {
        refreshInterval: 5 * 60 * 1000,
    })
}
