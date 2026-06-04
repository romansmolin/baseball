import type { WeeklyScoreState } from '../../../src/generated/prisma/enums'

// JSON breakdown shape stored in `WeeklyScoreCache.breakdown`. Mirrors the
// per-slot + per-game audit trail the /me UI surfaces. `rawPoints` is the
// per-slot total before the captain multiplier; `finalPoints` is after.
export interface WeeklyScoreBreakdownSlotGame {
    gamePk: number
    points: number
    status: string
}

export interface WeeklyScoreBreakdownSlot {
    externalPlayerId: number
    playerName: string
    slotPosition: string
    isCaptain: boolean
    rawPoints: number
    finalPoints: number
    games: WeeklyScoreBreakdownSlotGame[]
}

export interface WeeklyScoreBreakdown {
    slots: WeeklyScoreBreakdownSlot[]
    rule: { name: string; version: number }
    // Optional flag: this week pre-dates the member's join → the snapshot
    // service never wrote a frozen lineup, so the score is a settled 0.
    notJoinedYet?: boolean
}

export interface WeeklyScoreCacheRecord {
    id: string
    leagueMemberId: string
    week: number
    points: number
    state: WeeklyScoreState
    staleAt: Date
    breakdown: WeeklyScoreBreakdown
    scoringRuleId: string
}

export interface WeeklyScoreCacheUpsertInput {
    leagueMemberId: string
    week: number
    points: number
    state: WeeklyScoreState
    staleAt: Date
    breakdown: WeeklyScoreBreakdown
    scoringRuleId: string
}

export interface IWeeklyScoreCacheRepository {
    findByMember(leagueMemberId: string): Promise<WeeklyScoreCacheRecord[]>
    upsert(input: WeeklyScoreCacheUpsertInput): Promise<WeeklyScoreCacheRecord>
}
