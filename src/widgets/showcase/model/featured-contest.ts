import { canEditDailyContest, type DailyContestSummary } from '@/shared/daily-contests'

export function selectFeaturedContest(contests: readonly DailyContestSummary[], now: number): DailyContestSummary | null {
    if (!Number.isFinite(now)) return null

    const current = contests.filter(contest =>
        contest.mode === 'LIVE'
        && (contest.status === 'OPEN' || contest.status === 'LOCKED')
        && Number.isFinite(Date.parse(contest.locksAt)),
    )
    const byDeadline = (a: DailyContestSummary, b: DailyContestSummary) =>
        Date.parse(a.locksAt) - Date.parse(b.locksAt) || a.id.localeCompare(b.id)
    const open = current.filter(contest => canEditDailyContest(contest, now)).sort(byDeadline)
    if (open.length) return open[0]

    return current.sort((a, b) => -byDeadline(a, b))[0] ?? null
}

export function getFeaturedContestAction(contest: DailyContestSummary, hasEntry: boolean | null, now: number) {
    const editable = canEditDailyContest(contest, now)
    const label = !editable
        ? hasEntry ? 'View your entry' : 'View contest'
        : hasEntry === null ? 'Open contest' : hasEntry ? 'Edit your lineup' : 'Build a lineup · Free'

    return { href: `/contests/${encodeURIComponent(contest.id)}`, label, editable }
}
