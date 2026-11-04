'use client'

import { useCallback, useMemo, useReducer, useState } from 'react'

import {
    BASEBALL_LEAGUES,
    DEFAULT_BASEBALL_LEAGUE,
    isSupportedBaseballLeague,
    type SupportedBaseballLeague,
} from '@/shared/baseball'
import { usePlayersData, type PlayerModel } from '@/entities/players'

import { PLAYERS_PER_PAGE, updatePlayersQuery } from './player-query-state'
import type { DrawerTab, League, Player, PositionFilter, StatusFilter } from './player.type'

const BROWSE_LEAGUE_SLUGS: SupportedBaseballLeague[] = [
    'mlb',
    'triple-a',
    'double-a',
    'high-a',
    'single-a',
    'rookie',
    'winter-leagues',
]

const BROWSE_LEAGUES: League[] = BASEBALL_LEAGUES.filter((league) =>
    BROWSE_LEAGUE_SLUGS.includes(league.slug),
).map((league) => ({ slug: league.slug, name: league.name, color: league.color }))

export interface PlayersState {
    players: Player[]
    leagues: League[]
    visiblePlayers: Player[]
    totalPlayers: number
    playersByLeague: Map<string, number>
    search: string
    position: PositionFilter
    league: SupportedBaseballLeague
    status: StatusFilter
    offset: number
    limit: number
    selectedPlayerId: number | null
    selectedPlayer: Player | null
    drawerTab: DrawerTab
    isLoading: boolean
    error: Error | undefined
    setSearch: (query: string) => void
    setPosition: (position: PositionFilter) => void
    setLeague: (slug: string) => void
    setStatus: (status: StatusFilter) => void
    setOffset: (offset: number) => void
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
        statsSeason: model.statsSeason,
        battingStats: model.battingStats,
        pitchingStats: model.pitchingStats,
    }
}

export const usePlayersState = (): PlayersState => {
    const [query, dispatch] = useReducer(updatePlayersQuery, {
        league: DEFAULT_BASEBALL_LEAGUE,
        search: '',
        position: 'all',
        status: 'all',
        offset: 0,
        limit: PLAYERS_PER_PAGE,
    })
    const [selectedPlayerId, setSelectedPlayerIdRaw] = useState<number | null>(null)
    const [drawerTab, setDrawerTab] = useState<DrawerTab>('stats')
    const { data, isLoading, error, mutate } = usePlayersData(query)

    const allPlayers = useMemo<Player[]>(
        () => (data?.items ?? []).map(mapModelToViewPlayer),
        [data],
    )
    const selectedPlayer = useMemo(
        () => allPlayers.find((player) => player.id === selectedPlayerId) ?? null,
        [allPlayers, selectedPlayerId],
    )
    const playersByLeague = useMemo(
        () => new Map<string, number>([[query.league, data?.total ?? 0]]),
        [query.league, data?.total],
    )

    const updateFilter = useCallback((patch: Parameters<typeof updatePlayersQuery>[1]) => {
        dispatch(patch)
        setSelectedPlayerIdRaw(null)
    }, [])
    const setSearch = useCallback((search: string) => updateFilter({ search }), [updateFilter])
    const setPosition = useCallback((position: PositionFilter) => updateFilter({ position }), [updateFilter])
    const setStatus = useCallback((status: StatusFilter) => updateFilter({ status }), [updateFilter])
    const setLeague = useCallback((slug: string) => {
        if (isSupportedBaseballLeague(slug)) updateFilter({ league: slug })
    }, [updateFilter])
    const setOffset = useCallback((offset: number) => {
        dispatch({ offset })
        setSelectedPlayerIdRaw(null)
    }, [])
    const setSelectedPlayerId = useCallback((id: number | null) => {
        setSelectedPlayerIdRaw(id)
        setDrawerTab('stats')
    }, [])
    const clearFilters = useCallback(() => {
        updateFilter({ search: '', position: 'all', status: 'all' })
    }, [updateFilter])

    return {
        players: allPlayers,
        leagues: BROWSE_LEAGUES,
        visiblePlayers: allPlayers,
        totalPlayers: data?.total ?? allPlayers.length,
        playersByLeague,
        search: query.search,
        position: query.position,
        league: query.league,
        status: query.status,
        offset: query.offset,
        limit: query.limit,
        selectedPlayerId,
        selectedPlayer,
        drawerTab,
        isLoading,
        error: error as Error | undefined,
        setSearch,
        setPosition,
        setLeague,
        setStatus,
        setOffset,
        setSelectedPlayerId,
        setDrawerTab,
        clearFilters,
        retry: () => void mutate(),
    }
}
