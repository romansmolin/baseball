import type { ScoringRuleRecord } from '../../repositories/scoring-rule/scoring-rule.repository.interface'

// Per-week score returned by `weeklyBreakdown` for the /me progress UI.
// `awarded === false` means the week is in the future relative to the
// caller's `currentWeek` (or has no cache row yet) — used to keep totals
// stable while still rendering the week skeleton.
export interface WeeklyMemberScore {
    week: number
    points: number
    state: 'PARTIAL' | 'FINAL'
    awarded: boolean
}

// Slimmer per-league input — the scoring engine no longer needs the live
// roster from the caller. Roster snapshots are loaded internally per-week
// from WeeklyLineup, so historical weeks stay reproducible even when the
// live lineup changes.
export interface ScoringInputLeague {
    id: string
    startsAt: Date
    totalWeeks: number
}

export interface IWeeklyScoringService {
    /**
     * Resolves the scoring rule for a league via the injected repository.
     * Convenience for callers that don't already have the rule loaded.
     */
    findRuleForLeague(leagueId: string): Promise<ScoringRuleRecord | null>

    /**
     * Ensures the WeeklyScoreCache contains a fresh row for the member for
     * each week in [1..throughWeek]. For each week W, looks up the member's
     * frozen `WeeklyLineup` snapshot — if absent, the week is treated as
     * "not joined yet" and resolves to a FINAL 0-point row. Idempotent.
     * Tolerant of provider outages.
     */
    prepareMemberWeeks(
        memberId: string,
        league: ScoringInputLeague,
        rule: ScoringRuleRecord,
        throughWeek: number,
    ): Promise<void>

    /**
     * Pure cache read; missing weeks resolve to 0 with `awarded: false`.
     * The caller is expected to have invoked `prepareMemberWeeks` first.
     */
    weeklyBreakdown(memberId: string, totalWeeks: number): Promise<WeeklyMemberScore[]>

    /** Sum of cached points across weeks 1..throughWeek. */
    totalThroughWeek(memberId: string, throughWeek: number): Promise<number>
}
