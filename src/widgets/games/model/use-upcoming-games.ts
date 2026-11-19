import { useMemo } from 'react'

import { useUpcomingGamesData } from '@/entities/games'
import type { ApiError } from '@/shared/api/api-error'

import { groupGamesByDate } from './games-grouping'

const HUB_LIMIT = 30

export function useUpcomingGames() {
    const { data, isLoading, error } = useUpcomingGamesData(HUB_LIMIT)
    const days = useMemo(() => groupGamesByDate(data ?? []), [data])
    return { days, isLoading, error: error as ApiError | undefined }
}
