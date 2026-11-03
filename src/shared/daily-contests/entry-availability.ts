import type { DailyContestMode, DailyContestStatus } from './types'

export function canEditDailyContest(contest: { mode: DailyContestMode; status: DailyContestStatus; locksAt: string }, now: number): boolean {
    const deadline = Date.parse(contest.locksAt)
    return contest.mode === 'LIVE' && contest.status === 'OPEN' && Number.isFinite(now) && Number.isFinite(deadline) && now < deadline
}
