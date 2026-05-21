'use client'

import { useMemo } from 'react'

import {
    ContestDetailPanel,
    ContestsList,
    ContestsToolbar,
    ContestsViewLayout,
    LeaguesSidebar,
    useContestsState,
} from '@/widgets/contests'

export const ContestsView = () => {
    const state = useContestsState()

    const leaguesBySlug = useMemo(
        () => new Map(state.leagues.map((l) => [l.slug, l])),
        [state.leagues],
    )

    return (
        <ContestsViewLayout
            sidebar={
                <LeaguesSidebar
                    leagues={state.filteredLeagues}
                    contestsByLeague={state.contestsByLeague}
                    selectedLeagueSlug={state.selectedLeagueSlug}
                    leagueSearch={state.leagueSearch}
                    onSearch={state.setLeagueSearch}
                    onSelect={state.setSelectedLeagueSlug}
                />
            }
            toolbar={
                <ContestsToolbar
                    selectedLeague={state.selectedLeague}
                    statusFilter={state.statusFilter}
                    sortKey={state.sortKey}
                    leagues={state.leagues}
                    onClearLeague={() => state.setSelectedLeagueSlug(null)}
                    onSelectLeague={state.setSelectedLeagueSlug}
                    onStatusChange={state.setStatusFilter}
                    onSortChange={state.setSortKey}
                />
            }
            list={
                <ContestsList
                    contests={state.visibleContests}
                    leaguesBySlug={leaguesBySlug}
                    selectedContestId={state.selectedContestId}
                    onSelect={state.setSelectedContestId}
                />
            }
            detail={
                state.selectedContest ? (
                    <ContestDetailPanel
                        contest={state.selectedContest}
                        league={leaguesBySlug.get(state.selectedContest.leagueSlug)}
                        onClose={() => state.setSelectedContestId(null)}
                    />
                ) : null
            }
        />
    )
}
