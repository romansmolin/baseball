import { useMemo, useState } from 'react'

import { useUpcomingGamesData } from '@/entities/games'
import type { ApiError } from '@/shared/api/api-error'

export type NextGamesTab = 'soon' | 'this-week' | 'next-week'

const SOON_LIMIT = 6
// Covers through the end of next week from any day (see MAX_DAYS on the server).
const WEEKS_DAYS = 14
const WEEKS_LIMIT = 250
export const PAGE_SIZE = 12
const MS_PER_DAY = 24 * 60 * 60 * 1000

// Start of the next Monday, viewer's time zone.
const startOfNextWeek = (now: Date): Date => {
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + 7 - ((d.getDay() + 6) % 7))
    return d
}

export function useNextGames() {
    const [tab, setTab] = useState<NextGamesTab>('soon')
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

    const isWeek = tab !== 'soon'
    const soon = useUpcomingGamesData(SOON_LIMIT, !isWeek)
    const weeks = useUpcomingGamesData(WEEKS_LIMIT, isWeek, WEEKS_DAYS)
    const source = isWeek ? weeks : soon

    const games = useMemo(() => {
        const all = source.data ?? []
        if (!isWeek) return all
        const thisWeekEnd = startOfNextWeek(new Date())
        const nextWeekEnd = new Date(thisWeekEnd.getTime() + 7 * MS_PER_DAY)
        return all.filter((g) => {
            const t = new Date(g.gameDateUtc).getTime()
            return tab === 'this-week'
                ? t < thisWeekEnd.getTime()
                : t >= thisWeekEnd.getTime() && t < nextWeekEnd.getTime()
        })
    }, [source.data, isWeek, tab])

    const selectTab = (next: NextGamesTab) => {
        setTab(next)
        setVisibleCount(PAGE_SIZE)
    }

    return {
        tab,
        selectTab,
        games: isWeek ? games.slice(0, visibleCount) : games,
        hasMore: isWeek && games.length > visibleCount,
        showMore: () => setVisibleCount((n) => n + PAGE_SIZE),
        isLoading: source.isLoading,
        error: source.error as ApiError | undefined,
    }
}
