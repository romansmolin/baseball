'use client'

import {
    LeagueDetailDrawer,
    LeaguesEmptyState,
    LeaguesGrid,
    LeaguesHeader,
    LeaguesToolbar,
    LeaguesViewLayout,
    useLeaguesState,
} from '@/widgets/leagues'

export const LeaguesView = () => {
    const state = useLeaguesState()
    const hasResults = state.visibleLeagues.length > 0

    return (
        <LeaguesViewLayout
            header={<LeaguesHeader totalLeagues={state.totalLeagues} liveLeagues={state.liveLeagues} />}
            toolbar={
                <LeaguesToolbar
                    search={state.search}
                    region={state.region}
                    liveOnly={state.liveOnly}
                    sortKey={state.sortKey}
                    onSearch={state.setSearch}
                    onRegionChange={state.setRegion}
                    onLiveOnlyChange={state.setLiveOnly}
                    onSortChange={state.setSortKey}
                />
            }
            resultsMeta={
                <div className="mb-3 text-xs text-muted-foreground">
                    <span>{state.visibleLeagues.length}</span> leagues shown
                </div>
            }
            content={
                hasResults ? (
                    <LeaguesGrid
                        leagues={state.visibleLeagues}
                        onSelect={state.setSelectedLeagueSlug}
                    />
                ) : (
                    <LeaguesEmptyState onClearFilters={state.clearFilters} />
                )
            }
            drawer={
                <LeagueDetailDrawer
                    league={state.selectedLeague}
                    onClose={() => state.setSelectedLeagueSlug(null)}
                />
            }
        />
    )
}
