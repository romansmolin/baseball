import { CAPTAIN_MULTIPLIER } from '../../../src/shared/team-builder'
import type {
    ProviderBoxScore,
    ProviderGameStatus,
    ProviderScheduledGame,
} from '../../providers/dto/provider-schedule.dto'
import type { ISportsProvider } from '../../providers/sports-provider.interface'
import type {
    IWeeklyScoreCacheRepository,
    WeeklyScoreBreakdown,
    WeeklyScoreBreakdownSlot,
    WeeklyScoreBreakdownSlotGame,
    WeeklyScoreCacheRecord,
    WeeklyScoreCacheUpsertInput,
} from '../../repositories/weekly-score-cache/weekly-score-cache.repository.interface'
import type {
    IScoringRuleRepository,
    ScoringRuleRecord,
} from '../../repositories/scoring-rule/scoring-rule.repository.interface'
import type {
    IWeeklyLineupRepository,
    WeeklyLineupRecord,
    WeeklyLineupSlotRecord,
} from '../../repositories/weekly-lineup/weekly-lineup.repository.interface'
import { tournamentWeekRange } from '../tournaments/tournament-week-range.util'

import { scoreGameForPlayer } from './scoring-engine'
import type {
    IWeeklyScoringService,
    ScoringInputLeague,
    WeeklyMemberScore,
} from './weekly-scoring.service.interface'

// Stale-at policies (milliseconds). Tuned for "lazy read-through" — short
// enough that live boxscores converge quickly, long enough to avoid
// hammering the provider on every page refresh.
const STALE_IN_PROGRESS_MS = 30 * 60 * 1000 // 30 minutes
const STALE_POSTPONED_TAIL_MS = 6 * 60 * 60 * 1000 // 6 hours
const STALE_PROVIDER_OUTAGE_MS = 15 * 60 * 1000 // 15 minutes

// Sentinel for FINAL rows that should never re-read for staleness. Far-future
// date keeps the column non-null without polluting query semantics.
const STALE_NEVER = new Date('2100-01-01T00:00:00.000Z')

// Game statuses that don't block a week from going FINAL. CANCELLED counts as
// "no contribution, no remaining work" — same treatment as a FINAL game with
// 0 points.
const NON_BLOCKING_STATUSES: ReadonlySet<ProviderGameStatus> = new Set([
    'FINAL',
    'CANCELLED',
])

export class WeeklyScoringService implements IWeeklyScoringService {
    private readonly weeklyScoreCacheRepository: IWeeklyScoreCacheRepository
    private readonly scoringRuleRepository: IScoringRuleRepository
    private readonly sportsProvider: ISportsProvider
    private readonly weeklyLineupRepository: IWeeklyLineupRepository

    constructor(
        weeklyScoreCacheRepository: IWeeklyScoreCacheRepository,
        scoringRuleRepository: IScoringRuleRepository,
        sportsProvider: ISportsProvider,
        weeklyLineupRepository: IWeeklyLineupRepository,
    ) {
        this.weeklyScoreCacheRepository = weeklyScoreCacheRepository
        this.scoringRuleRepository = scoringRuleRepository
        this.sportsProvider = sportsProvider
        this.weeklyLineupRepository = weeklyLineupRepository
    }

    async findRuleForLeague(leagueId: string): Promise<ScoringRuleRecord | null> {
        return this.scoringRuleRepository.findByLeagueId(leagueId)
    }

    async prepareMemberWeeks(
        memberId: string,
        league: ScoringInputLeague,
        rule: ScoringRuleRecord,
        throughWeek: number,
    ): Promise<void> {
        if (throughWeek < 1) return

        const existing = await this.weeklyScoreCacheRepository.findByMember(memberId)
        const byWeek = new Map<number, WeeklyScoreCacheRecord>()
        for (const row of existing) byWeek.set(row.week, row)

        // Pull the full set of frozen lineups once. The hot path for "score
        // every member for every week" reads dozens of rows per member; a
        // single batch is cheaper than N point-lookups.
        const lineups = await this.weeklyLineupRepository.findManyByMember(memberId)
        const lineupByWeek = new Map<number, WeeklyLineupRecord>()
        for (const lineup of lineups) lineupByWeek.set(lineup.week, lineup)

        const now = new Date()

        for (let week = 1; week <= throughWeek; week++) {
            const cached = byWeek.get(week)
            if (cached && !this.isStale(cached, now)) continue

            const lineup = lineupByWeek.get(week)

            // No frozen lineup → the member hadn't joined when this week
            // locked. Write a FINAL 0-point row that records the "not
            // joined yet" reason so the audit trail stays honest. Skip if
            // we already cached the same answer.
            if (!lineup) {
                if (cached && cached.state === 'FINAL' && cached.points === 0) continue

                await this.weeklyScoreCacheRepository.upsert(
                    this.notJoinedYetCacheRow(memberId, week, rule),
                )
                continue
            }

            const computed = await this.computeWeek(
                memberId,
                league,
                lineup,
                rule,
                week,
                now,
                cached,
            )

            if (computed) {
                await this.weeklyScoreCacheRepository.upsert(computed)
            }
        }
    }

    async weeklyBreakdown(
        memberId: string,
        totalWeeks: number,
    ): Promise<WeeklyMemberScore[]> {
        if (totalWeeks < 1) return []

        const rows = await this.weeklyScoreCacheRepository.findByMember(memberId)
        const byWeek = new Map<number, WeeklyScoreCacheRecord>()
        for (const row of rows) byWeek.set(row.week, row)

        const out: WeeklyMemberScore[] = []
        for (let week = 1; week <= totalWeeks; week++) {
            const row = byWeek.get(week)
            if (row) {
                out.push({
                    week,
                    points: row.points,
                    state: row.state,
                    awarded: true,
                })
            } else {
                out.push({
                    week,
                    points: 0,
                    state: 'PARTIAL',
                    awarded: false,
                })
            }
        }
        return out
    }

    async totalThroughWeek(memberId: string, throughWeek: number): Promise<number> {
        if (throughWeek < 1) return 0
        const rows = await this.weeklyScoreCacheRepository.findByMember(memberId)
        let total = 0
        for (const row of rows) {
            if (row.week >= 1 && row.week <= throughWeek) total += row.points
        }
        return total
    }

    // ------- internals -------

    private isStale(row: WeeklyScoreCacheRecord, now: Date): boolean {
        if (row.state === 'FINAL') return false
        return row.staleAt.getTime() <= now.getTime()
    }

    /**
     * Compute one week. Returns the upsert input, or `null` if the provider
     * is unavailable AND a prior cache row already exists (in which case we
     * preserve the existing row by skipping the write).
     */
    private async computeWeek(
        memberId: string,
        league: ScoringInputLeague,
        lineup: WeeklyLineupRecord,
        rule: ScoringRuleRecord,
        week: number,
        now: Date,
        existing: WeeklyScoreCacheRecord | undefined,
    ): Promise<WeeklyScoreCacheUpsertInput | null> {
        const { startUtc, endUtc } = tournamentWeekRange(league.startsAt, week)

        let schedule: ProviderScheduledGame[] = []
        try {
            schedule = await this.sportsProvider.getSchedule({
                startDateUtc: startUtc,
                endDateUtc: endUtc,
            })
        } catch {
            return this.providerOutageFallback({
                memberId,
                week,
                rule,
                existing,
                now,
            })
        }

        const boxScores: ProviderBoxScore[] = []
        let outageHit = false
        for (const game of schedule) {
            try {
                const box = await this.sportsProvider.getBoxScore(game.gamePk)
                if (box) boxScores.push(box)
            } catch {
                outageHit = true
            }
        }

        if (outageHit && boxScores.length === 0) {
            return this.providerOutageFallback({
                memberId,
                week,
                rule,
                existing,
                now,
            })
        }

        const slots = this.buildSlotBreakdown(
            lineup.slots,
            lineup.captainExternalPlayerId,
            boxScores,
            rule,
        )
        const totalPoints = slots.reduce((sum, s) => sum + s.finalPoints, 0)

        const allConsideredFinalOrCancelled = schedule.every((g) =>
            NON_BLOCKING_STATUSES.has(g.status),
        )
        const weekEnded = endUtc.getTime() <= now.getTime()
        const isFinal = weekEnded && allConsideredFinalOrCancelled && !outageHit

        let staleAt: Date
        let state: 'PARTIAL' | 'FINAL'
        if (isFinal) {
            state = 'FINAL'
            staleAt = STALE_NEVER
        } else {
            state = 'PARTIAL'
            if (!weekEnded) {
                staleAt = new Date(now.getTime() + STALE_IN_PROGRESS_MS)
            } else {
                // Week ended but at least one game still pending FINAL —
                // typically POSTPONED awaiting a reschedule decision.
                staleAt = new Date(now.getTime() + STALE_POSTPONED_TAIL_MS)
            }
        }

        const breakdown: WeeklyScoreBreakdown = {
            slots,
            rule: { name: rule.name, version: rule.version },
        }

        return {
            leagueMemberId: memberId,
            week,
            points: totalPoints,
            state,
            staleAt,
            breakdown,
            scoringRuleId: rule.id,
        }
    }

    private buildSlotBreakdown(
        rosterSlots: WeeklyLineupSlotRecord[],
        captainExternalPlayerId: number | null,
        boxScores: ProviderBoxScore[],
        rule: ScoringRuleRecord,
    ): WeeklyScoreBreakdownSlot[] {
        const result: WeeklyScoreBreakdownSlot[] = []

        for (const slot of rosterSlots) {
            const games: WeeklyScoreBreakdownSlotGame[] = []
            let rawPoints = 0
            for (const box of boxScores) {
                const pts = scoreGameForPlayer(box, slot.externalPlayerId, rule.rule)
                // Only record contributions where the player actually appeared
                // (non-zero) to keep the audit JSON tight. A 0 from a player who
                // didn't appear is indistinguishable from a 0 from a hitless
                // appearance, so we filter both — the FINAL state guarantees the
                // total is settled either way.
                if (pts !== 0) {
                    games.push({ gamePk: box.gamePk, points: pts, status: box.status })
                    rawPoints += pts
                }
            }

            const isCaptain =
                captainExternalPlayerId !== null &&
                slot.externalPlayerId === captainExternalPlayerId
            const finalPoints = isCaptain ? rawPoints * CAPTAIN_MULTIPLIER : rawPoints

            result.push({
                externalPlayerId: slot.externalPlayerId,
                playerName: slot.playerName,
                slotPosition: slot.slotPosition,
                isCaptain,
                rawPoints,
                finalPoints,
                games,
            })
        }

        return result
    }

    /**
     * Provider outage path: keep the existing cache row if we have one, else
     * write a placeholder PARTIAL row with 0 points so subsequent reads can
     * try again after a short window.
     */
    private providerOutageFallback(args: {
        memberId: string
        week: number
        rule: ScoringRuleRecord
        existing: WeeklyScoreCacheRecord | undefined
        now: Date
    }): WeeklyScoreCacheUpsertInput | null {
        if (args.existing) return null

        const breakdown: WeeklyScoreBreakdown = {
            slots: [],
            rule: { name: args.rule.name, version: args.rule.version },
        }
        return {
            leagueMemberId: args.memberId,
            week: args.week,
            points: 0,
            state: 'PARTIAL',
            staleAt: new Date(args.now.getTime() + STALE_PROVIDER_OUTAGE_MS),
            breakdown,
            scoringRuleId: args.rule.id,
        }
    }

    /**
     * Settled "not joined yet" placeholder. FINAL state — late joiners
     * always read 0 for weeks before their snapshot horizon, no provider
     * call needed. The breakdown tags the reason for audit completeness.
     */
    private notJoinedYetCacheRow(
        memberId: string,
        week: number,
        rule: ScoringRuleRecord,
    ): WeeklyScoreCacheUpsertInput {
        const breakdown: WeeklyScoreBreakdown = {
            slots: [],
            rule: { name: rule.name, version: rule.version },
            notJoinedYet: true,
        }
        return {
            leagueMemberId: memberId,
            week,
            points: 0,
            state: 'FINAL',
            staleAt: STALE_NEVER,
            breakdown,
            scoringRuleId: rule.id,
        }
    }
}
