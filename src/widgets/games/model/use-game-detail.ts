import { useGameDetailData } from '@/entities/games'
import type { ApiError } from '@/shared/api/api-error'

export function useGameDetail(gamePk: number) {
    const { data, isLoading, error } = useGameDetailData(gamePk)
    return { detail: data ?? null, isLoading, error: error as ApiError | undefined }
}
