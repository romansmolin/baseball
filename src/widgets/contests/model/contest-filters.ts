import type { Contest, SortKey, StatusFilter } from './contest.type'

export const filterContests = (
    contests: Contest[],
    {
        leagueSlug,
        status,
    }: {
        leagueSlug: string | null
        status: StatusFilter
    },
): Contest[] =>
    contests.filter((contest) => {
        if (leagueSlug && contest.leagueSlug !== leagueSlug) return false

        switch (status) {
            case 'all':
                return true
            case 'live':
                return contest.status === 'live'
            case 'open':
                return contest.status === 'open'
            case 'soon':
                return contest.status === 'soon'
            case 'free':
                return contest.entryFeeCredits === 0
        }
    })

export const sortContests = (contests: Contest[], sort: SortKey): Contest[] => {
    const out = [...contests]
    switch (sort) {
        case 'prize':
            return out.sort((a, b) => b.prizeCredits - a.prizeCredits)
        case 'entryFee':
            return out.sort((a, b) => a.entryFeeCredits - b.entryFeeCredits)
        case 'lockSoon':
            return out.sort((a, b) => a.lockAtMinutes - b.lockAtMinutes)
        case 'fillPct':
            return out.sort(
                (a, b) => b.currentEntries / b.maxEntries - a.currentEntries / a.maxEntries,
            )
    }
}
