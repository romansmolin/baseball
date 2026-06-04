'use client'

import { useMemo } from 'react'

import {
    PlayerDetailDrawer,
    PlayersEmptyState,
    PlayersHeader,
    PlayersList,
    PlayersSidebar,
    PlayersToolbar,
    PlayersViewLayout,
    usePlayersState,
} from '@/widgets/players'

export const PlayersView = () => {
    const state = usePlayersState()
    const leaguesBySlug = useMemo(
        () => new Map(state.leagues.map((l) => [l.slug, l])),
        [state.leagues],
    )

    const hasResults = state.visiblePlayers.length > 0

    return (
        <PlayersViewLayout
            header={<PlayersHeader totalPlayers={state.totalPlayers} />}
            sidebar={
                <PlayersSidebar
                    leagues={state.leagues}
                    playersByLeague={state.playersByLeague}
                    playersByStatus={state.playersByStatus}
                    totalPlayers={state.totalPlayers}
                    search={state.search}
                    league={state.league}
                    status={state.status}
                    onSearch={state.setSearch}
                    onLeagueChange={state.setLeague}
                    onStatusChange={state.setStatus}
                />
            }
            toolbar={
                <PlayersToolbar
                    position={state.position}
                    sortKey={state.sortKey}
                    onPositionChange={state.setPosition}
                    onSortChange={state.setSortKey}
                />
            }
            content={
                hasResults ? (
                    <PlayersList
                        players={state.visiblePlayers}
                        leaguesBySlug={leaguesBySlug}
                        onSelect={state.setSelectedPlayerId}
                    />
                ) : (
                    <PlayersEmptyState onClearFilters={state.clearFilters} />
                )
            }
            drawer={
                <PlayerDetailDrawer
                    player={state.selectedPlayer}
                    league={
                        state.selectedPlayer
                            ? leaguesBySlug.get(state.selectedPlayer.leagueSlug)
                            : undefined
                    }
                    drawerTab={state.drawerTab}
                    onClose={() => state.setSelectedPlayerId(null)}
                    onTabChange={state.setDrawerTab}
                />
            }
        />
    )
}
