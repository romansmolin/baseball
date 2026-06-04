'use client'

import { useMemo } from 'react'

import {
    LeaguesSidebar,
    TournamentDetailPanel,
    TournamentsList,
    TournamentsToolbar,
    TournamentsViewLayout,
    useTournamentsState,
} from '@/widgets/tournaments'

export const TournamentsView = () => {
    const state = useTournamentsState()

    const leaguesBySlug = useMemo(
        () => new Map(state.leagues.map((l) => [l.slug, l])),
        [state.leagues],
    )

    return (
        <TournamentsViewLayout
            sidebar={
                <LeaguesSidebar
                    leagues={state.filteredLeagues}
                    tournamentsByLeague={state.tournamentsByLeague}
                    selectedLeagueSlug={state.selectedLeagueSlug}
                    leagueSearch={state.leagueSearch}
                    onSearch={state.setLeagueSearch}
                    onSelect={state.setSelectedLeagueSlug}
                />
            }
            toolbar={
                <TournamentsToolbar
                    selectedLeague={state.selectedLeague}
                    statusFilter={state.statusFilter}
                    sortKey={state.sortKey}
                    leagues={state.leagues}
                    mineOnly={state.mineOnly}
                    myTournamentsCount={state.myTournamentsCount}
                    onClearLeague={() => state.setSelectedLeagueSlug(null)}
                    onSelectLeague={state.setSelectedLeagueSlug}
                    onStatusChange={state.setStatusFilter}
                    onSortChange={state.setSortKey}
                    onMineOnlyChange={state.setMineOnly}
                />
            }
            list={
                <TournamentsList
                    tournaments={state.visibleTournaments}
                    leaguesBySlug={leaguesBySlug}
                    selectedTournamentId={state.selectedTournamentId}
                    onSelect={state.setSelectedTournamentId}
                    isLoading={state.isLoading}
                    error={state.error}
                />
            }
            detail={
                state.selectedTournament ? (
                    <TournamentDetailPanel
                        tournament={state.selectedTournament}
                        league={leaguesBySlug.get(state.selectedTournament.leagueSlug)}
                        standings={state.standings}
                        isLoadingStandings={state.isLoadingStandings}
                        standingsError={state.standingsError}
                        onClose={() => state.setSelectedTournamentId(null)}
                    />
                ) : null
            }
        />
    )
}
