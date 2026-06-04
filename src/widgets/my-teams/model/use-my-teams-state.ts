'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { useMyTeamsData } from '@/entities/my-teams'

import { filterTeams, sortTeams } from './team-filters'
import type { League, SortKey, StatusFilter, Team, ViewMode } from './team.type'

export interface MyTeamsState {
    teams: Team[]
    leagues: League[]
    teamsByLeague: Map<string, number>
    visibleTeams: Team[]
    totalTeams: number
    totalLeagues: number
    search: string
    selectedLeagueSlug: string | null
    selectedLeague: League | null
    statusFilter: StatusFilter
    sortKey: SortKey
    viewMode: ViewMode
    favs: Record<string, boolean>
    selectedTeamId: string | null
    selectedTeam: Team | null
    isLoading: boolean
    error: Error | undefined
    retry: () => void
    setSearch: (q: string) => void
    setSelectedLeagueSlug: (slug: string | null) => void
    setStatusFilter: (status: StatusFilter) => void
    setSortKey: (sort: SortKey) => void
    setViewMode: (view: ViewMode) => void
    setSelectedTeamId: (id: string | null) => void
    toggleFav: (id: string) => void
    clearFilters: () => void
}

const EMPTY_TEAMS: Team[] = []
const EMPTY_LEAGUES: League[] = []

export const useMyTeamsState = (): MyTeamsState => {
    const { data, error, isLoading, mutate } = useMyTeamsData()
    const teams = data?.teams ?? EMPTY_TEAMS
    const leagues = data?.leagues ?? EMPTY_LEAGUES

    const [search, setSearch] = useState('')
    const [selectedLeagueSlug, setSelectedLeagueSlug] = useState<string | null>(null)
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
    const [sortKey, setSortKey] = useState<SortKey>('recent')
    const [viewMode, setViewMode] = useState<ViewMode>('grid')
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
    const [favs, setFavs] = useState<Record<string, boolean>>({})

    useEffect(() => {
        if (!data) return
        setFavs((prev) => {
            const next: Record<string, boolean> = { ...prev }
            for (const t of data.teams) {
                if (next[t.id] === undefined) next[t.id] = t.fav
            }
            return next
        })
    }, [data])

    const teamsByLeague = useMemo(() => {
        const map = new Map<string, number>()
        for (const t of teams) map.set(t.leagueSlug, (map.get(t.leagueSlug) ?? 0) + 1)
        return map
    }, [teams])

    const visibleTeams = useMemo(
        () =>
            sortTeams(
                filterTeams(teams, {
                    search,
                    leagueSlug: selectedLeagueSlug,
                    status: statusFilter,
                    favs,
                }),
                sortKey,
            ),
        [teams, search, selectedLeagueSlug, statusFilter, favs, sortKey],
    )

    const selectedLeague = useMemo(
        () => leagues.find((l) => l.slug === selectedLeagueSlug) ?? null,
        [leagues, selectedLeagueSlug],
    )

    const selectedTeam = useMemo(
        () => teams.find((t) => t.id === selectedTeamId) ?? null,
        [teams, selectedTeamId],
    )

    const totalLeagues = useMemo(() => new Set(teams.map((t) => t.leagueSlug)).size, [teams])

    const toggleFav = useCallback(
        (id: string) => setFavs((prev) => ({ ...prev, [id]: !prev[id] })),
        [],
    )

    const clearFilters = useCallback(() => {
        setSearch('')
        setSelectedLeagueSlug(null)
        setStatusFilter('all')
    }, [])

    const retry = useCallback(() => {
        void mutate()
    }, [mutate])

    return {
        teams,
        leagues,
        teamsByLeague,
        visibleTeams,
        totalTeams: teams.length,
        totalLeagues,
        search,
        selectedLeagueSlug,
        selectedLeague,
        statusFilter,
        sortKey,
        viewMode,
        favs,
        selectedTeamId,
        selectedTeam,
        isLoading,
        error: error as Error | undefined,
        retry,
        setSearch,
        setSelectedLeagueSlug,
        setStatusFilter,
        setSortKey,
        setViewMode,
        setSelectedTeamId,
        toggleFav,
        clearFilters,
    }
}
