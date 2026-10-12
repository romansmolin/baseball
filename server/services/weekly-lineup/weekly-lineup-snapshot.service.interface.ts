import type { WeeklyLineupRecord } from '../../repositories/weekly-lineup/weekly-lineup.repository.interface'

export interface SnapshotAllForCurrentWeekResult {
    tournamentsScanned: number
    membersSnapshotted: number
}

export interface BackfillMissingWeeksOptions {
    // false = report only, nothing is written.
    apply: boolean
    // true = also fill weeks that predate the member's join (seeded/demo data).
    ignoreJoinDate: boolean
    budgetMs: number
}

export interface BackfillMissingWeeksResult {
    applied: boolean
    timedOut: boolean
    missingLineups: number
    created: number
    failed: number
    cacheRowsInvalidated: number
    tournaments: Array<{ name: string; members: number; missingLineups: number }>
}

export interface IWeeklyLineupSnapshotService {
    /**
     * Snapshot a member's CURRENT FantasyTeam.rosterSlots into a WeeklyLineup
     * row for `week` — if a row doesn't already exist. Idempotent: returns the
     * existing row untouched on repeat. Members with no roster get an empty
     * snapshot so scoring still has a deterministic 0-point row.
     */
    snapshotMemberForWeek(memberId: string, week: number): Promise<WeeklyLineupRecord>

    /**
     * Snapshot the upcoming (un-locked) week's lineup at JOIN time:
     *   - DRAFTING (currentWeek = 0)  → snapshot for week 1
     *   - IN_SEASON / PLAYOFFS at week N → snapshot for week N+1 (the next
     *     un-locked week; week N's lineup is already locked the moment the
     *     week boundary passed)
     *   - COMPLETED / ARCHIVED → no snapshot (no future weeks remain). The
     *     join flow already rejects these statuses upstream.
     */
    snapshotForJoin(memberId: string, leagueId: string): Promise<WeeklyLineupRecord | null>

    /**
     * Cron entry point: walk every active tournament (DRAFTING / IN_SEASON /
     * PLAYOFFS) and snapshot the current week for every member who doesn't
     * yet have a row. Idempotent. Returns observability counts.
     */
    snapshotAllForCurrentWeek(): Promise<SnapshotAllForCurrentWeekResult>

    /**
     * One-off repair: for every active tournament, create the WeeklyLineup rows
     * a member should have had for weeks 1..currentWeek (from the member's
     * CURRENT roster — the historical roster is not recoverable). Also drops
     * the cached "not joined yet" zero-score rows for those weeks so scoring
     * recomputes them. Idempotent.
     */
    backfillMissingWeeks(options: BackfillMissingWeeksOptions): Promise<BackfillMissingWeeksResult>
}
