import { useMemo } from 'react'

import { useRecentGamesData, useUpcomingGamesData } from '@/entities/dashboard'
import type { UpcomingGameRecord } from '@/shared/games'

export interface GamesDayGroup {
    key: string
    label: string
    games: UpcomingGameRecord[]
}

const RESULTS_LIMIT = 30
const UPCOMING_LIMIT = 10

const dayKey = (date: Date) =>
    `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`

const dayLabel = (date: Date, now: Date): string => {
    const diff = Math.round(
        (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
            new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) /
            86_400_000,
    )
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Yesterday'
    if (diff === -1) return 'Tomorrow'
    return date.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
    })
}

const groupByDay = (games: UpcomingGameRecord[]): GamesDayGroup[] => {
    const now = new Date()
    const groups = new Map<string, GamesDayGroup>()
    for (const game of games) {
        const date = new Date(game.gameDateUtc)
        const key = dayKey(date)
        const group = groups.get(key) ?? { key, label: dayLabel(date, now), games: [] }
        group.games.push(game)
        groups.set(key, group)
    }
    return [...groups.values()]
}

export function useGamesResults() {
    const results = useRecentGamesData(RESULTS_LIMIT)
    const upcoming = useUpcomingGamesData(UPCOMING_LIMIT)

    const resultGroups = useMemo(() => groupByDay(results.data ?? []), [results.data])
    const upcomingGroups = useMemo(() => groupByDay(upcoming.data ?? []), [upcoming.data])
    const liveCount = useMemo(
        () => (results.data ?? []).filter((g) => g.status === 'LIVE').length,
        [results.data],
    )

    return {
        resultGroups,
        upcomingGroups,
        liveCount,
        isLoading: results.isLoading || upcoming.isLoading,
        resultsError: Boolean(results.error),
        upcomingError: Boolean(upcoming.error),
    }
}
