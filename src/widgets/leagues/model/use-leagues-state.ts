'use client'

import { useCallback, useMemo, useState } from 'react'

import { useTournamentsData } from '@/entities/tournaments'

import { leagues as baseLeagues } from './mock-data'
import { filterLeagues, sortLeagues } from './league-filters'
import type { League, RegionFilter, SortKey } from './league.type'

export interface LeaguesState {
    leagues: League[]
    visibleLeagues: League[]
    totalLeagues: number
    liveLeagues: number
    search: string
    region: RegionFilter
    liveOnly: boolean
    sortKey: SortKey
    selectedLeagueSlug: string | null
    selectedLeague: League | null
    setSearch: (q: string) => void
    setRegion: (region: RegionFilter) => void
    setLiveOnly: (live: boolean) => void
    setSortKey: (sort: SortKey) => void
    setSelectedLeagueSlug: (slug: string | null) => void
    clearFilters: () => void
}

export const useLeaguesState = (): LeaguesState => {
    const [search, setSearch] = useState('')
    const [region, setRegion] = useState<RegionFilter>('all')
    const [liveOnly, setLiveOnly] = useState(false)
    const [sortKey, setSortKey] = useState<SortKey>('tournaments')
    const [selectedLeagueSlug, setSelectedLeagueSlug] = useState<string | null>(null)

    // Hard truth — what the API actually has. The mock data's openTournaments
    // counts are decorative numbers; we override them with the real count per
    // league so the badge, sort, and Browse-tournaments CTA all reflect what
    // the catalog will actually show.
    const { data: tournamentsList } = useTournamentsData({ visibility: ['PUBLIC'] })

    const leagues = useMemo<League[]>(() => {
        const counts = new Map<string, number>()
        for (const t of tournamentsList?.items ?? []) {
            counts.set(t.leagueSlug, (counts.get(t.leagueSlug) ?? 0) + 1)
        }
        // Until the tournaments fetch resolves, fall back to the mock count
        // so the UI doesn't flicker to 0 on first paint.
        if (counts.size === 0) return baseLeagues
        return baseLeagues.map((league) => ({
            ...league,
            openTournaments: counts.get(league.slug) ?? 0,
        }))
    }, [tournamentsList])

    const visibleLeagues = useMemo(
        () => sortLeagues(filterLeagues(leagues, { search, region, liveOnly }), sortKey),
        [leagues, search, region, liveOnly, sortKey],
    )

    const selectedLeague = useMemo(
        () => leagues.find((l) => l.slug === selectedLeagueSlug) ?? null,
        [leagues, selectedLeagueSlug],
    )

    const liveLeagues = useMemo(
        () => leagues.filter((l) => l.season === 'live').length,
        [leagues],
    )

    const clearFilters = useCallback(() => {
        setSearch('')
        setRegion('all')
        setLiveOnly(false)
        setSortKey('tournaments')
    }, [])

    return {
        leagues,
        visibleLeagues,
        totalLeagues: leagues.length,
        liveLeagues,
        search,
        region,
        liveOnly,
        sortKey,
        selectedLeagueSlug,
        selectedLeague,
        setSearch,
        setRegion,
        setLiveOnly,
        setSortKey,
        setSelectedLeagueSlug,
        clearFilters,
    }
}
