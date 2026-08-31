'use client'

import { useCallback, useMemo, useState } from 'react'

import {
    BASEBALL_LEAGUES,
    DEFAULT_BASEBALL_LEAGUE,
    isSupportedBaseballLeague,
    type SupportedBaseballLeague,
} from '@/shared/baseball'
import { usePlayersData, type PlayerModel } from '@/entities/players'

import { filterPlayers, sortPlayers } from './player-filters'
import { AVAILABILITY_ORDER } from './player.type'
import type {
    DrawerTab,
    League,
    Player,
    PositionFilter,
    SortKey,
    StatusFilter,
} from './player.type'

// Real player leagues shown in the sidebar. MiLB rookie/complex ball is
// excluded here because its rosters churn too fast to browse usefully — the
// four full-season MiLB levels plus MLB cover the product story.
const BROWSE_LEAGUE_SLUGS: SupportedBaseballLeague[] = [
    'mlb',
    'triple-a',
    'double-a',
    'high-a',
    'single-a',
]

const BROWSE_LEAGUES: League[] = BASEBALL_LEAGUES.filter((l) =>
    BROWSE_LEAGUE_SLUGS.includes(l.slug),
).map((l) => ({ slug: l.slug, name: l.name, color: l.color }))

export interface PlayersState {
    players: Player[]
    leagues: League[]
    visiblePlayers: Player[]
    totalPlayers: number
    playersByLeague: Map<string, number>
    playersByStatus: Map<string, number>
    search: string
    position: PositionFilter
    league: SupportedBaseballLeague
    status: StatusFilter
    sortKey: SortKey
    selectedPlayerId: number | null
    selectedPlayer: Player | null
    drawerTab: DrawerTab
    isLoading: boolean
    error: Error | undefined
    setSearch: (q: string) => void
    setPosition: (p: PositionFilter) => void
    setLeague: (slug: string) => void
    setStatus: (s: StatusFilter) => void
    setSortKey: (s: SortKey) => void
    setSelectedPlayerId: (id: number | null) => void
    setDrawerTab: (tab: DrawerTab) => void
    clearFilters: () => void
    retry: () => void
}

function mapModelToViewPlayer(model: PlayerModel): Player {
    return {
        id: model.id,
        name: model.fullName,
        pos: model.position,
        team: model.teamAbbreviation ?? model.teamName ?? '—',
        leagueSlug: model.leagueSlug,
        status: model.active ? 'active' : 'out',
        age: model.age,
        bats: model.bats ?? '—',
        throws: model.throws ?? '—',
        jerseyNumber: model.jerseyNumber,
        photoUrl: model.photoUrl,
        // Not provided by the MLB Stats API player feed.
        proj: 0,
        avg: 0,
        salary: 0,
        own: 0,
        form: [],
        injuries: [],
        transfers: [],
        metrics: {},
    }
}

export const usePlayersState = (): PlayersState => {
    const [search, setSearch] = useState('')
    const [position, setPosition] = useState<PositionFilter>('all')
    const [league, setLeagueRaw] = useState<SupportedBaseballLeague>(DEFAULT_BASEBALL_LEAGUE)
    const [status, setStatus] = useState<StatusFilter>('all')
    const [sortKey, setSortKey] = useState<SortKey>('name')
    const [selectedPlayerId, setSelectedPlayerIdRaw] = useState<number | null>(null)
    const [drawerTab, setDrawerTab] = useState<DrawerTab>('stats')

    const { data, isLoading, error, mutate } = usePlayersData(league, search)

    const allPlayers = useMemo<Player[]>(
        () => (data?.items ?? []).map(mapModelToViewPlayer),
        [data],
    )

    const visiblePlayers = useMemo(
        () =>
            sortPlayers(
                // League is already scoped by the fetch — pass 'all' here.
                filterPlayers(allPlayers, { search: '', position, league: 'all', status }),
                sortKey,
            ),
        [allPlayers, position, status, sortKey],
    )

    const selectedPlayer = useMemo(
        () => allPlayers.find((p) => p.id === selectedPlayerId) ?? null,
        [allPlayers, selectedPlayerId],
    )

    const playersByLeague = useMemo(() => {
        // Only the active league is loaded; other counts stay unknown (0).
        const map = new Map<string, number>()
        map.set(league, data?.total ?? allPlayers.length)
        return map
    }, [league, data, allPlayers.length])

    const playersByStatus = useMemo(() => {
        const map = new Map<string, number>()
        for (const s of AVAILABILITY_ORDER) map.set(s, 0)
        for (const p of allPlayers) map.set(p.status, (map.get(p.status) ?? 0) + 1)
        return map
    }, [allPlayers])

    const setLeague = useCallback((slug: string) => {
        if (isSupportedBaseballLeague(slug)) {
            setLeagueRaw(slug)
            setSelectedPlayerIdRaw(null)
        }
    }, [])

    const setSelectedPlayerId = useCallback((id: number | null) => {
        setSelectedPlayerIdRaw(id)
        setDrawerTab('stats')
    }, [])

    const clearFilters = useCallback(() => {
        setSearch('')
        setPosition('all')
        setStatus('all')
    }, [])

    return {
        players: allPlayers,
        leagues: BROWSE_LEAGUES,
        visiblePlayers,
        totalPlayers: data?.total ?? allPlayers.length,
        playersByLeague,
        playersByStatus,
        search,
        position,
        league,
        status,
        sortKey,
        selectedPlayerId,
        selectedPlayer,
        drawerTab,
        isLoading,
        error: error as Error | undefined,
        setSearch,
        setPosition,
        setLeague,
        setStatus,
        setSortKey,
        setSelectedPlayerId,
        setDrawerTab,
        clearFilters,
        retry: () => void mutate(),
    }
}
