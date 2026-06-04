import type { TournamentRecord, TournamentStatus } from '@/shared/tournaments'

// Pure presentation helpers — no React, no fetching.

export type DisplayStatus = 'drafting' | 'in_season' | 'completed'

// Collapse the underlying enum to the three UI buckets we expose. Playoffs is
// shown as in-season; archived is treated as completed.
export const getDisplayStatus = (status: TournamentStatus): DisplayStatus => {
    if (status === 'DRAFTING') return 'drafting'
    if (status === 'IN_SEASON' || status === 'PLAYOFFS') return 'in_season'
    return 'completed'
}

export const formatTournamentStatus = (status: TournamentStatus): string => {
    switch (getDisplayStatus(status)) {
        case 'drafting':
            return 'Drafting'
        case 'in_season':
            return 'In season'
        case 'completed':
            return 'Completed'
    }
}

// "Week 4 / 12" — when DRAFTING we say "Starts in 5 days" instead.
export const formatWeekProgress = (
    tournament: Pick<
        TournamentRecord,
        'status' | 'currentWeek' | 'totalWeeks' | 'startsAt'
    >,
    nowMs = Date.now(),
): string => {
    if (tournament.status === 'DRAFTING') {
        const deltaMs = new Date(tournament.startsAt).getTime() - nowMs
        if (deltaMs <= 0) return 'Starting soon'
        const days = Math.ceil(deltaMs / (24 * 60 * 60 * 1000))
        if (days === 1) return 'Starts tomorrow'
        return `Starts in ${days} days`
    }
    return `Week ${tournament.currentWeek} / ${tournament.totalWeeks}`
}

export const formatDateRange = (
    startsAtIso: string,
    endsAtIso: string,
): string => {
    const start = new Date(startsAtIso)
    const end = new Date(endsAtIso)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return ''
    }
    const fmt = (date: Date): string =>
        date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
        })
    return `${fmt(start)} – ${fmt(end)}`
}

export const formatPrizePool = (credits: number): string =>
    `${credits.toLocaleString()} cr`

export const formatEntryFee = (credits: number): string =>
    credits === 0 ? 'Free entry' : `${credits.toLocaleString()} cr entry`
