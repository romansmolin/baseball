'use client'

import { useMemo } from 'react'

import {
    PlayerDetailDrawer,
    PlayersEmptyState,
    PlayersHeader,
    PlayersList,
    PlayersPagination,
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

    let content: React.ReactNode
    if (state.isLoading) {
        content = <PlayersStatus message="Loading players…" />
    } else if (state.error) {
        content = (
            <PlayersStatus
                message="Couldn't load players from the sports provider."
                actionLabel="Retry"
                onAction={state.retry}
            />
        )
    } else if (hasResults) {
        content = (
            <>
                <PlayersList
                    players={state.visiblePlayers}
                    leaguesBySlug={leaguesBySlug}
                    onSelect={state.setSelectedPlayerId}
                />
                <PlayersPagination
                    offset={state.offset}
                    total={state.totalPlayers}
                    onChange={state.setOffset}
                />
            </>
        )
    } else {
        content = (
            <>
                <PlayersEmptyState onClearFilters={state.clearFilters} />
                <PlayersPagination
                    offset={state.offset}
                    total={state.totalPlayers}
                    onChange={state.setOffset}
                />
            </>
        )
    }

    return (
        <PlayersViewLayout
            header={<PlayersHeader totalPlayers={state.totalPlayers} />}
            sidebar={
                <PlayersSidebar
                    leagues={state.leagues}
                    playersByLeague={state.playersByLeague}
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
                    onPositionChange={state.setPosition}
                />
            }
            content={content}
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

const PlayersStatus = ({
    message,
    actionLabel,
    onAction,
}: {
    message: string
    actionLabel?: string
    onAction?: () => void
}) => (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-foreground/15 py-20 text-center">
        <p className="text-sm text-muted-foreground">{message}</p>
        {actionLabel && onAction ? (
            <button
                type="button"
                onClick={onAction}
                className="mt-4 rounded-md border border-foreground/15 px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
                {actionLabel}
            </button>
        ) : null}
    </div>
)
