'use client'

import { useMemo } from 'react'

import {
    MyTeamsHeader,
    MyTeamsViewLayout,
    TeamDetailDrawer,
    TeamsEmptyState,
    TeamsErrorState,
    TeamsFirstTimeEmptyState,
    TeamsGrid,
    TeamsGridSkeleton,
    TeamsSidebar,
    TeamsToolbar,
    useMyTeamsState,
} from '@/widgets/my-teams'

export const MyTeamsView = () => {
    const state = useMyTeamsState()

    const leaguesBySlug = useMemo(
        () => new Map(state.leagues.map((l) => [l.slug, l])),
        [state.leagues],
    )

    const hasAnyTeams = state.totalTeams > 0
    const hasVisibleTeams = state.visibleTeams.length > 0

    const content = state.isLoading ? (
        <TeamsGridSkeleton view={state.viewMode} />
    ) : state.error ? (
        <TeamsErrorState onRetry={state.retry} message={state.error.message} />
    ) : !hasAnyTeams ? (
        <TeamsFirstTimeEmptyState />
    ) : hasVisibleTeams ? (
        <TeamsGrid
            teams={state.visibleTeams}
            leaguesBySlug={leaguesBySlug}
            favs={state.favs}
            view={state.viewMode}
            onSelect={state.setSelectedTeamId}
            onToggleFav={state.toggleFav}
        />
    ) : (
        <TeamsEmptyState onClearFilters={state.clearFilters} />
    )

    const resultsMeta =
        state.isLoading || state.error || !hasAnyTeams ? null : (
            <div className="mb-3 text-xs text-muted-foreground">
                <span>{state.visibleTeams.length}</span> teams shown
            </div>
        )

    return (
        <MyTeamsViewLayout
            header={
                <MyTeamsHeader totalTeams={state.totalTeams} totalLeagues={state.totalLeagues} />
            }
            sidebar={
                <TeamsSidebar
                    leagues={state.leagues}
                    teamsByLeague={state.teamsByLeague}
                    selectedLeagueSlug={state.selectedLeagueSlug}
                    search={state.search}
                    onSearch={state.setSearch}
                    onSelect={state.setSelectedLeagueSlug}
                />
            }
            toolbar={
                <TeamsToolbar
                    statusFilter={state.statusFilter}
                    sortKey={state.sortKey}
                    viewMode={state.viewMode}
                    leagues={state.leagues}
                    selectedLeagueSlug={state.selectedLeagueSlug}
                    onStatusChange={state.setStatusFilter}
                    onSortChange={state.setSortKey}
                    onViewChange={state.setViewMode}
                    onSelectLeague={state.setSelectedLeagueSlug}
                />
            }
            resultsMeta={resultsMeta}
            content={content}
            drawer={
                <TeamDetailDrawer
                    team={state.selectedTeam}
                    league={
                        state.selectedTeam
                            ? leaguesBySlug.get(state.selectedTeam.leagueSlug)
                            : undefined
                    }
                    isFav={state.selectedTeam ? !!state.favs[state.selectedTeam.id] : false}
                    onClose={() => state.setSelectedTeamId(null)}
                    onToggleFav={() => {
                        if (state.selectedTeam) state.toggleFav(state.selectedTeam.id)
                    }}
                />
            }
        />
    )
}
