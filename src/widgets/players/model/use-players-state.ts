'use client'

import { useCallback, useMemo, useState } from 'react'

import { leagues, players } from './mock-data'
import { filterPlayers, sortPlayers } from './player-filters'
import { AVAILABILITY_ORDER } from './player.type'
import type {
    DrawerTab,
    League,
    LeagueFilter,
    Player,
    PositionFilter,
    SortKey,
    StatusFilter,
} from './player.type'

export interface PlayersState {
    players: Player[]
    leagues: League[]
    visiblePlayers: Player[]
    totalPlayers: number
    playersByLeague: Map<string, number>
    playersByStatus: Map<string, number>
    search: string
    position: PositionFilter
    league: LeagueFilter
    status: StatusFilter
    sortKey: SortKey
    selectedPlayerId: number | null
    selectedPlayer: Player | null
    drawerTab: DrawerTab
    setSearch: (q: string) => void
    setPosition: (p: PositionFilter) => void
    setLeague: (l: LeagueFilter) => void
    setStatus: (s: StatusFilter) => void
    setSortKey: (s: SortKey) => void
    setSelectedPlayerId: (id: number | null) => void
    setDrawerTab: (tab: DrawerTab) => void
    clearFilters: () => void
}

export const usePlayersState = (): PlayersState => {
    const [search, setSearch] = useState('')
    const [position, setPosition] = useState<PositionFilter>('all')
    const [league, setLeague] = useState<LeagueFilter>('all')
    const [status, setStatus] = useState<StatusFilter>('all')
    const [sortKey, setSortKey] = useState<SortKey>('proj')
    const [selectedPlayerId, setSelectedPlayerIdRaw] = useState<number | null>(null)
    const [drawerTab, setDrawerTab] = useState<DrawerTab>('stats')

    const visiblePlayers = useMemo(
        () =>
            sortPlayers(
                filterPlayers(players, { search, position, league, status }),
                sortKey,
            ),
        [search, position, league, status, sortKey],
    )

    const selectedPlayer = useMemo(
        () => players.find((p) => p.id === selectedPlayerId) ?? null,
        [selectedPlayerId],
    )

    const playersByLeague = useMemo(() => {
        const map = new Map<string, number>()
        for (const p of players) map.set(p.leagueSlug, (map.get(p.leagueSlug) ?? 0) + 1)
        return map
    }, [])

    const playersByStatus = useMemo(() => {
        const map = new Map<string, number>()
        for (const s of AVAILABILITY_ORDER) map.set(s, 0)
        for (const p of players) map.set(p.status, (map.get(p.status) ?? 0) + 1)
        return map
    }, [])

    const setSelectedPlayerId = useCallback((id: number | null) => {
        setSelectedPlayerIdRaw(id)
        setDrawerTab('stats')
    }, [])

    const clearFilters = useCallback(() => {
        setSearch('')
        setPosition('all')
        setLeague('all')
        setStatus('all')
    }, [])

    return {
        players,
        leagues,
        visiblePlayers,
        totalPlayers: players.length,
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
        setSearch,
        setPosition,
        setLeague,
        setStatus,
        setSortKey,
        setSelectedPlayerId,
        setDrawerTab,
        clearFilters,
    }
}
