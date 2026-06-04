import { LeagueStatus } from '../../../src/generated/prisma/enums'

const MS_PER_DAY = 1000 * 60 * 60 * 24
const MS_PER_WEEK = MS_PER_DAY * 7

export interface TournamentWeekInput {
    status: LeagueStatus
    startsAt: Date
    totalWeeks: number
    now?: Date
}

// Pure function — current week is derived, never stored. The formula matches
// the orchestrator contract:
// - DRAFTING            → 0
// - IN_SEASON           → min(totalWeeks, max(1, floor((now - startsAt) / 7d) + 1))
// - PLAYOFFS            → same as IN_SEASON (mid-season state)
// - COMPLETED / ARCHIVED → totalWeeks
export function computeTournamentCurrentWeek(input: TournamentWeekInput): number {
    const { status, startsAt, totalWeeks } = input
    const now = input.now ?? new Date()

    if (status === LeagueStatus.DRAFTING) return 0
    if (status === LeagueStatus.COMPLETED || status === LeagueStatus.ARCHIVED) {
        return totalWeeks
    }

    const elapsedMs = now.getTime() - startsAt.getTime()
    if (elapsedMs < 0) return 0

    const naturalWeek = Math.floor(elapsedMs / MS_PER_WEEK) + 1
    if (naturalWeek < 1) return 1
    if (naturalWeek > totalWeeks) return totalWeeks
    return naturalWeek
}
