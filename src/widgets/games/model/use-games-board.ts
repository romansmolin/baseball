import { useMemo, useState } from 'react'

import { useUpcomingGamesData } from '@/entities/games'
import type { ApiError } from '@/shared/api/api-error'
import type { GameLeague } from '@/shared/games'

import { groupGamesByDate } from './games-grouping'
import { matchesQuery, pickSpotlight, slateStats } from './games-board'

// A week of games; MLB plays about 15 a day.
const LIMIT = 150
const DAYS = 7

export type LeagueFilter = 'all' | GameLeague

export function useGamesBoard() {
    const { data, isLoading, error } = useUpcomingGamesData(LIMIT, true, DAYS)
    const [selectedKey, setSelectedKey] = useState<string | null>(null)
    const [query, setQuery] = useState('')
    const [league, setLeague] = useState<LeagueFilter>('all')

    const days = useMemo(() => groupGamesByDate(data ?? []), [data])
    // A day that is no longer in the schedule falls back to the first one.
    const activeKey = days.find((d) => d.dateKey === selectedKey)?.dateKey ?? days[0]?.dateKey ?? null
    const dayGames = useMemo(() => days.find((d) => d.dateKey === activeKey)?.games ?? [], [days, activeKey])

    const slate = useMemo(
        () => (league === 'all' ? dayGames : dayGames.filter((g) => (g.leagueSlug ?? 'mlb') === league)),
        [dayGames, league],
    )
    const matchups = useMemo(() => slate.filter((g) => matchesQuery(g, query)), [slate, query])
    const leagues = useMemo(() => new Set(dayGames.map((g) => g.leagueSlug ?? 'mlb')), [dayGames])

    return {
        isLoading,
        error: error as ApiError | undefined,
        days: days.map((d) => ({ dateKey: d.dateKey, count: d.games.length })),
        activeKey,
        selectDay: setSelectedKey,
        query,
        setQuery,
        league,
        setLeague,
        leagues,
        stats: useMemo(() => slateStats(slate), [slate]),
        spotlight: useMemo(() => pickSpotlight(slate), [slate]),
        matchups,
    }
}
