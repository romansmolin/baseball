import useSWR from 'swr'

import { fetchGameDetail } from '../api/fetch-game-detail'

export function useGameDetailData(gamePk: number) {
    return useSWR(['games', 'detail', gamePk], () => fetchGameDetail(gamePk), {
        refreshInterval: 5 * 60 * 1000,
    })
}
