'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import {
    useMyTournamentsData,
    useStandingsData,
    useTournamentsData,
} from '@/entities/tournaments'
import { useLeaguesData } from '@/entities/team-builder'
import type { ApiError } from '@/shared/api/api-error'
import type {
    TournamentRecord,
    TournamentStandingsResponse,
} from '@/shared/tournaments'

import {
    mapStatusFilterToApiStatuses,
    sortTournaments,
} from './tournament-filters'
import type { LeagueOption, Region, SortKey, StatusFilter } from './tournament.type'

export interface TournamentsState {
    leagues: LeagueOption[]
    filteredLeagues: LeagueOption[]
    tournamentsByLeague: Map<string, number>
    visibleTournaments: TournamentRecord[]
    selectedLeagueSlug: string | null
    selectedLeague: LeagueOption | null
    statusFilter: StatusFilter
    sortKey: SortKey
    leagueSearch: string
    selectedTournamentId: string | null
    selectedTournament: TournamentRecord | null
    standings: TournamentStandingsResponse | undefined
    mineOnly: boolean
    myTournamentsCount: number
    isLoading: boolean
    isLoadingStandings: boolean
    isLoadingMine: boolean
    error: ApiError | undefined
    standingsError: ApiError | undefined
    setSelectedLeagueSlug: (slug: string | null) => void
    setStatusFilter: (status: StatusFilter) => void
    setSortKey: (sort: SortKey) => void
    setLeagueSearch: (q: string) => void
    setSelectedTournamentId: (id: string | null) => void
    setMineOnly: (mineOnly: boolean) => void
}

const ALLOWED_REGIONS = new Set<Region>([
    'north-america',
    'japan-korea',
    'latin-america',
    'caribbean',
    'australia',
])

const isRegion = (value: string): value is Region =>
    ALLOWED_REGIONS.has(value as Region)

export const useTournamentsState = (): TournamentsState => {
    // Seed the league filter from `?league=<slug>` so deep links from the
    // Leagues page land pre-filtered. We only read on first render — the user
    // is free to clear the chip without us yanking it back from the URL.
    const searchParams = useSearchParams()
    const initialLeagueSlug = searchParams?.get('league') ?? null

    const [selectedLeagueSlug, setSelectedLeagueSlug] = useState<string | null>(
        initialLeagueSlug,
    )
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
    const [sortKey, setSortKey] = useState<SortKey>('startsSoonest')
    const [leagueSearch, setLeagueSearch] = useState('')
    const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(
        null,
    )
    const [mineOnly, setMineOnly] = useState(false)

    // Catalog is public-only; private tournaments are joined via invite codes
    // and never listed here. Status filter passes through to the API.
    const apiStatus = mapStatusFilterToApiStatuses(statusFilter)
    const {
        data: listData,
        error: listError,
        isLoading: isLoadingList,
    } = useTournamentsData({
        leagueSlug: selectedLeagueSlug ?? undefined,
        status: apiStatus,
        visibility: ['PUBLIC'],
    })

    const {
        data: standings,
        error: standingsError,
        isLoading: isLoadingStandings,
    } = useStandingsData(selectedTournamentId)

    // Joined tournaments are fetched unconditionally so the toolbar's "Mine"
    // chip can show the count even when the filter is off. Intersection
    // happens below; cache key is independent of catalog filters.
    const { data: myTournaments, isLoading: isLoadingMine } = useMyTournamentsData()

    const { data: leaguesData } = useLeaguesData()

    const leagues = useMemo<LeagueOption[]>(() => {
        if (!leaguesData) return []
        return leaguesData
            .filter((l) => isRegion(l.region))
            .map((l) => ({
                slug: l.slug,
                name: l.name,
                region: l.region as Region,
                dotColor: l.dotColor,
            }))
    }, [leaguesData])

    const allTournaments = useMemo<TournamentRecord[]>(
        () => listData?.items ?? [],
        [listData],
    )

    const myTournamentIds = useMemo(
        () => new Set((myTournaments ?? []).map((t) => t.id)),
        [myTournaments],
    )

    // When the Mine toggle is on, we intersect against the joined set rather
    // than swapping the data source. This keeps league/status/sort filters
    // composable with "Mine" (e.g. "my IN_SEASON MLB tournaments").
    const filteredByMine = useMemo(
        () =>
            mineOnly
                ? allTournaments.filter((t) => myTournamentIds.has(t.id))
                : allTournaments,
        [allTournaments, myTournamentIds, mineOnly],
    )

    const visibleTournaments = useMemo(
        () => sortTournaments(filteredByMine, sortKey),
        [filteredByMine, sortKey],
    )

    const tournamentsByLeague = useMemo(() => {
        const map = new Map<string, number>()
        for (const t of allTournaments) {
            map.set(t.leagueSlug, (map.get(t.leagueSlug) ?? 0) + 1)
        }
        return map
    }, [allTournaments])

    const filteredLeagues = useMemo(() => {
        const q = leagueSearch.trim().toLowerCase()
        if (!q) return leagues
        return leagues.filter((l) => l.name.toLowerCase().includes(q))
    }, [leagues, leagueSearch])

    const selectedLeague = useMemo(
        () => leagues.find((l) => l.slug === selectedLeagueSlug) ?? null,
        [leagues, selectedLeagueSlug],
    )

    const selectedTournament = useMemo(
        () => allTournaments.find((t) => t.id === selectedTournamentId) ?? null,
        [allTournaments, selectedTournamentId],
    )

    return {
        leagues,
        filteredLeagues,
        tournamentsByLeague,
        visibleTournaments,
        selectedLeagueSlug,
        selectedLeague,
        statusFilter,
        sortKey,
        leagueSearch,
        selectedTournamentId,
        selectedTournament,
        standings,
        mineOnly,
        myTournamentsCount: myTournaments?.length ?? 0,
        isLoading: isLoadingList,
        isLoadingStandings,
        isLoadingMine,
        error: listError as ApiError | undefined,
        standingsError: standingsError as ApiError | undefined,
        setSelectedLeagueSlug: (slug) => {
            setSelectedLeagueSlug(slug)
            setSelectedTournamentId(null)
        },
        setStatusFilter,
        setSortKey,
        setLeagueSearch,
        setSelectedTournamentId,
        setMineOnly,
    }
}
