import type { TournamentRecord, TournamentStatus } from '@/shared/tournaments'

import type { SortKey, StatusFilter } from './tournament.type'

// Map the toolbar's StatusFilter to API status values. "all" means no filter.
// "completed" collapses PLAYOFFS/COMPLETED/ARCHIVED into a single bucket because
// the UI only exposes three coarse states.
export const mapStatusFilterToApiStatuses = (
    status: StatusFilter,
): TournamentStatus[] | undefined => {
    switch (status) {
        case 'all':
            return undefined
        case 'drafting':
            return ['DRAFTING']
        case 'in_season':
            return ['IN_SEASON']
        case 'completed':
            return ['PLAYOFFS', 'COMPLETED', 'ARCHIVED']
    }
}

// Client-side sort. The API already orders results by status bucket; this
// lets the user re-sort the visible page without a round-trip.
export const sortTournaments = (
    tournaments: TournamentRecord[],
    sort: SortKey,
): TournamentRecord[] => {
    const out = [...tournaments]
    switch (sort) {
        case 'startsSoonest':
            return out.sort(
                (a, b) =>
                    new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
            )
        case 'endsLatest':
            return out.sort(
                (a, b) =>
                    new Date(b.endsAt).getTime() - new Date(a.endsAt).getTime(),
            )
        case 'prize':
            return out.sort((a, b) => b.prizePoolCredits - a.prizePoolCredits)
        case 'memberCount':
            return out.sort((a, b) => b.memberCount - a.memberCount)
    }
}
