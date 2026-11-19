import { useGameDetailData } from '@/entities/games'
import type { GameLeague } from '@/shared/games'
import type { ApiError } from '@/shared/api/api-error'

export function useGameDetail(gamePk: number, league: GameLeague) {
    const { data, isLoading, error } = useGameDetailData(gamePk, league)
    return { detail: data ?? null, isLoading, error: error as ApiError | undefined }
}
