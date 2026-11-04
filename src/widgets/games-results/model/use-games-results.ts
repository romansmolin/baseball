import { useMemo, useState } from 'react'

import { useRecentGamesData, useUpcomingGamesData } from '@/entities/dashboard'
import { getBaseballLeague } from '@/shared/baseball'
import type { UpcomingGameRecord } from '@/shared/games'

export interface GamesDayGroup {
    key: string
    label: string
    games: UpcomingGameRecord[]
}

export interface LeagueOption {
    slug: string
    label: string
    count: number
}

const RESULTS_LIMIT = 30
const UPCOMING_LIMIT = 12
export const ALL_LEAGUES = 'all'

export const leagueLabel = (slug: string | undefined) =>
    (slug && getBaseballLeague(slug)?.name) || 'Baseball'

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
    const [league, setLeague] = useState(ALL_LEAGUES)

    const leagueOptions = useMemo<LeagueOption[]>(() => {
        const counts = new Map<string, number>()
        for (const g of [...(results.data ?? []), ...(upcoming.data ?? [])]) {
            const slug = g.leagueSlug ?? 'mlb'
            counts.set(slug, (counts.get(slug) ?? 0) + 1)
        }
        return [...counts].map(([slug, count]) => ({ slug, label: leagueLabel(slug), count }))
    }, [results.data, upcoming.data])

    const matches = (g: UpcomingGameRecord) => league === ALL_LEAGUES || (g.leagueSlug ?? 'mlb') === league

    const filteredResults = useMemo(() => (results.data ?? []).filter(matches), [results.data, league]) // eslint-disable-line react-hooks/exhaustive-deps
    const liveGames = useMemo(() => filteredResults.filter((g) => g.status === 'LIVE'), [filteredResults])
    const resultGroups = useMemo(
        () => groupByDay(filteredResults.filter((g) => g.status !== 'LIVE')),
        [filteredResults],
    )
    const upcomingGroups = useMemo(
        () => groupByDay((upcoming.data ?? []).filter(matches)),
        [upcoming.data, league], // eslint-disable-line react-hooks/exhaustive-deps
    )

    return {
        league,
        setLeague,
        leagueOptions,
        liveGames,
        resultGroups,
        upcomingGroups,
        isLoading: results.isLoading || upcoming.isLoading,
        resultsError: Boolean(results.error),
        upcomingError: Boolean(upcoming.error),
    }
}
