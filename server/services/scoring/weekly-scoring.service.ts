import {
    isSupportedBaseballLeague,
    type SupportedBaseballLeague,
} from '../../../src/shared/baseball'
import { CAPTAIN_MULTIPLIER } from '../../../src/shared/team-builder'
import { mapWithConcurrency } from '../../shared/concurrency.utils'
import { canTeamScopeSchedule } from '../../providers/mlb/mlb-leagues.config'
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
    MemberScoresSummary,
    ScoringInputLeague,
    WeeklyMemberScore,
} from './weekly-scoring.service.interface'

// Stale-at policies (milliseconds). Tuned for "lazy read-through" — short
// enough that live boxscores converge quickly, long enough to avoid
// hammering the provider on every page refresh.
const STALE_IN_PROGRESS_MS = 30 * 60 * 1000 // 30 minutes
const STALE_POSTPONED_TAIL_MS = 6 * 60 * 60 * 1000 // 6 hours
const STALE_PROVIDER_OUTAGE_MS = 15 * 60 * 1000 // 15 minutes

// A week's schedule can hold 100+ games. Fetch their box scores a batch at a
// time rather than one-by-one (serial = tens of seconds cold) or all-at-once
// (stampedes the provider and gets throttled). 16 is comfortably within what
// the MLB Stats API tolerates from a single client.
const BOX_SCORE_FETCH_CONCURRENCY = 16

// A roster's frozen team names must resolve to at least this fraction of real
// team ids before we trust the team-scoped schedule fetch. Below it (name
// format drift, mid-season trades) we fall back to the full-league schedule so
// no games are missed.
const TEAM_RESOLUTION_MIN_RATIO = 0.75

// Team-scope the schedule only for tournaments whose scored span is at most
// this many weeks. Frozen-team ∪ current-team covers a player's whereabouts
// over a short window; across a long (8–12 week) backfill enough players move
// (early-season trades, IL stints, options to the minors) that only the
// full-league schedule stays exact. Long backfills are COMPLETED / late
// PLAYOFFS tournaments, warmed once by the cron — cold speed matters less
// there than getting the historical total right.
const MAX_TEAM_SCOPED_SPAN_WEEKS = 6

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

    // Per-instance memos. A scoring request touches one league/season and
    // repeats the same player ids across members/weeks, so these collapse the
    // provider lookups to roughly one call each per request.
    private readonly teamIdByNameCache = new Map<string, Map<string, number>>()
    private readonly currentTeamIdByPlayer = new Map<number, number | null>()

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

    /**
     * Best-effort read-through warm of the provider's schedule + box-score
     * caches. Every member of a tournament scores against the same games, so
     * calling this ONCE before scoring a whole roster turns an N-member cold
     * stampede (which the provider throttles) into a single cold pass the rest
     * read from cache.
     *
     * Only warms weeks that actually need provider data — a week is skipped
     * when every member already has a settled cache row for it (FINAL, or
     * PARTIAL still within its staleAt window). So a fully-scored tournament
     * warms nothing and a live one warms just the current week.
     *
     * Never throws — a provider outage just leaves the caches cold and the
     * per-member path handles it via its existing fallback.
     */
    async warmProviderCache(
        league: ScoringInputLeague,
        throughWeek: number,
        memberIds: string[],
    ): Promise<void> {
        if (throughWeek < 1 || memberIds.length === 0) return

        const now = new Date()
        const rows = await this.weeklyScoreCacheRepository.findByMembers(memberIds)
        const settledMembersByWeek = new Map<number, Set<string>>()
        for (const row of rows) {
            const settled =
                row.state === 'FINAL' || row.staleAt.getTime() > now.getTime()
            if (!settled) continue
            let set = settledMembersByWeek.get(row.week)
            if (!set) {
                set = new Set<string>()
                settledMembersByWeek.set(row.week, set)
            }
            set.add(row.leagueMemberId)
        }

        const weeksToWarm: number[] = []
        for (let week = 1; week <= throughWeek; week++) {
            if ((settledMembersByWeek.get(week)?.size ?? 0) < memberIds.length) {
                weeksToWarm.push(week)
            }
        }
        if (weeksToWarm.length === 0) return

        const providerLeague = isSupportedBaseballLeague(league.leagueSlug)
            ? league.leagueSlug
            : undefined

        // Union of every roster's teams across the tournament — the seed pools
        // draw from only a handful of real teams, so this scopes the warm to a
        // fraction of the league's games.
        const footprint =
            await this.weeklyLineupRepository.findRosterFootprintByMembers(memberIds)
        const teamIds =
            throughWeek <= MAX_TEAM_SCOPED_SPAN_WEEKS
                ? await this.resolveRosterTeamIds(footprint, providerLeague, league.season)
                : null

        for (const week of weeksToWarm) {
            const { startUtc, endUtc } = tournamentWeekRange(league.startsAt, week)

            let schedule: ProviderScheduledGame[]
            try {
                schedule = await this.sportsProvider.getSchedule({
                    startDateUtc: startUtc,
                    endDateUtc: endUtc,
                    league: providerLeague,
                    season: league.season,
                    teamIds: teamIds ?? undefined,
                })
            } catch {
                return
            }

            await mapWithConcurrency(
                schedule,
                BOX_SCORE_FETCH_CONCURRENCY,
                async (game) => {
                    try {
                        await this.sportsProvider.getBoxScore(game.gamePk, {
                            league: providerLeague,
                        })
                    } catch {
                        // Warm is best-effort; ignore individual failures.
                    }
                },
            )
        }
    }

    async summarizeScoresForMembers(
        memberIds: string[],
        throughWeek: number,
    ): Promise<MemberScoresSummary> {
        const totals = new Map(memberIds.map((memberId) => [memberId, 0]))
        if (throughWeek < 1 || memberIds.length === 0) {
            return { membersNeedingRefresh: [], totals }
        }

        const rows = await this.weeklyScoreCacheRepository.findByMembers(memberIds)
        const freshWeeksByMember = new Map<string, Set<number>>()
        const now = new Date()
        for (const row of rows) {
            if (row.week < 1 || row.week > throughWeek) continue
            totals.set(row.leagueMemberId, (totals.get(row.leagueMemberId) ?? 0) + row.points)
            if (!this.isStale(row, now)) {
                let weeks = freshWeeksByMember.get(row.leagueMemberId)
                if (!weeks) {
                    weeks = new Set<number>()
                    freshWeeksByMember.set(row.leagueMemberId, weeks)
                }
                weeks.add(row.week)
            }
        }
        return {
            membersNeedingRefresh: memberIds.filter(
                (memberId) => (freshWeeksByMember.get(memberId)?.size ?? 0) !== throughWeek,
            ),
            totals,
        }
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
                throughWeek,
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
                    slots: row.breakdown?.slots ?? [],
                })
            } else {
                out.push({
                    week,
                    points: 0,
                    state: 'PARTIAL',
                    awarded: false,
                    slots: [],
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

    async totalsThroughWeek(
        memberIds: string[],
        throughWeek: number,
    ): Promise<Map<string, number>> {
        const totals = new Map(memberIds.map((memberId) => [memberId, 0]))
        if (throughWeek < 1 || memberIds.length === 0) return totals

        const rows = await this.weeklyScoreCacheRepository.findByMembers(memberIds)
        for (const row of rows) {
            if (row.week < 1 || row.week > throughWeek) continue
            totals.set(row.leagueMemberId, (totals.get(row.leagueMemberId) ?? 0) + row.points)
        }
        return totals
    }

    // ------- internals -------

    private isStale(row: WeeklyScoreCacheRecord, now: Date): boolean {
        if (row.state === 'FINAL') return false
        return row.staleAt.getTime() <= now.getTime()
    }

    /**
     * Resolve a roster footprint (frozen team names + player ids) to the set
     * of real team ids whose games could contain any of those players — the
     * union of each player's frozen team and their current team, so a
     * mid-season trade doesn't hide a player's box scores.
     *
     * Returns `null` (→ caller uses the full-league schedule) when nothing
     * resolves confidently or the provider is unavailable, so scoring output
     * never silently changes.
     */
    private async resolveRosterTeamIds(
        footprint: { teamNames: string[]; externalPlayerIds: number[] },
        providerLeague: SupportedBaseballLeague | undefined,
        season: number,
    ): Promise<number[] | null> {
        // Only levels with stable in-season rosters can be safely team-scoped;
        // elsewhere the full-league schedule keeps scoring exact.
        if (!canTeamScopeSchedule(providerLeague)) return null

        const distinctNames = [...new Set(footprint.teamNames.filter((n) => n.length > 0))]
        const distinctPlayerIds = [...new Set(footprint.externalPlayerIds)]
        if (distinctNames.length === 0 && distinctPlayerIds.length === 0) return null

        const ids = new Set<number>()

        // 1) Frozen team names → ids.
        const nameLookup = await this.getTeamNameLookup(providerLeague, season)
        let nameMatched = 0
        if (nameLookup) {
            for (const name of distinctNames) {
                const id = nameLookup.get(name)
                if (id != null) {
                    ids.add(id)
                    nameMatched += 1
                }
            }
        }

        // 2) Each player's current team (catches post-lock trades).
        const currentTeamIds = await this.currentTeamIdsFor(distinctPlayerIds)
        let playerMatched = 0
        for (const id of currentTeamIds) {
            if (id != null) {
                ids.add(id)
                playerMatched += 1
            }
        }

        // Bail to the full schedule unless we're confident we have every
        // relevant team: names mostly matched AND every player's current team
        // resolved (or there were no players to resolve).
        const namesOk =
            distinctNames.length === 0 ||
            nameMatched >= Math.ceil(distinctNames.length * TEAM_RESOLUTION_MIN_RATIO)
        const playersOk =
            distinctPlayerIds.length === 0 || playerMatched === distinctPlayerIds.length
        if (!namesOk || !playersOk || ids.size === 0) return null

        return [...ids]
    }

    private async getTeamNameLookup(
        providerLeague: SupportedBaseballLeague | undefined,
        season: number,
    ): Promise<Map<string, number> | null> {
        const cacheKey = `${providerLeague ?? 'mlb'}:${season}`
        const cached = this.teamIdByNameCache.get(cacheKey)
        if (cached) return cached
        try {
            const teams = await this.sportsProvider.getTeams({ league: providerLeague, season })
            const lookup = new Map(teams.map((t) => [t.name, t.id]))
            this.teamIdByNameCache.set(cacheKey, lookup)
            return lookup
        } catch {
            return null
        }
    }

    private async currentTeamIdsFor(playerIds: number[]): Promise<(number | null)[]> {
        const missing = playerIds.filter((id) => !this.currentTeamIdByPlayer.has(id))
        if (missing.length > 0) {
            try {
                const players = await this.sportsProvider.getPlayersByIds(missing)
                const byId = new Map(players.map((p) => [p.id, p.teamId]))
                for (const id of missing) {
                    this.currentTeamIdByPlayer.set(id, byId.get(id) ?? null)
                }
            } catch {
                // Leave them unresolved — resolveRosterTeamIds treats that as
                // "not confident" and falls back to the full schedule.
            }
        }
        return playerIds.map((id) =>
            this.currentTeamIdByPlayer.has(id)
                ? (this.currentTeamIdByPlayer.get(id) ?? null)
                : null,
        )
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
        throughWeek: number,
        now: Date,
        existing: WeeklyScoreCacheRecord | undefined,
    ): Promise<WeeklyScoreCacheUpsertInput | null> {
        const { startUtc, endUtc } = tournamentWeekRange(league.startsAt, week)

        // Real tournaments always carry a supported slug; the guard keeps the
        // engine safe (falls back to MLB) if an unexpected value slips through.
        const providerLeague = isSupportedBaseballLeague(league.leagueSlug)
            ? league.leagueSlug
            : undefined

        // Scope the schedule to the ~9 teams this roster references instead of
        // the whole league — most box scores in a full-league week contain
        // nobody from the roster.
        const teamIds =
            throughWeek <= MAX_TEAM_SCOPED_SPAN_WEEKS
                ? await this.resolveRosterTeamIds(
                      {
                          teamNames: lineup.slots.map((s) => s.playerTeamName),
                          externalPlayerIds: lineup.slots.map((s) => s.externalPlayerId),
                      },
                      providerLeague,
                      league.season,
                  )
                : null

        let schedule: ProviderScheduledGame[] = []
        try {
            // Same league-wide URL for every member, so the provider cache is
            // hit after the first call; a per-roster teamIds URL is unique per
            // member and made every member pay a cold MLB request.
            const weekSchedule = await this.sportsProvider.getSchedule({
                startDateUtc: startUtc,
                endDateUtc: endUtc,
                league: providerLeague,
                season: league.season,
            })
            const rosterTeams = teamIds ? new Set(teamIds) : null
            schedule = rosterTeams
                ? weekSchedule.filter(
                      (game) =>
                          rosterTeams.has(game.homeTeamId) ||
                          rosterTeams.has(game.awayTeamId),
                  )
                : weekSchedule
        } catch {
            return this.providerOutageFallback({
                memberId,
                week,
                rule,
                existing,
                now,
            })
        }

        const fetched = await mapWithConcurrency(
            schedule,
            BOX_SCORE_FETCH_CONCURRENCY,
            async (game) => {
                try {
                    return {
                        box: await this.sportsProvider.getBoxScore(game.gamePk, {
                            league: providerLeague,
                        }),
                        outage: false,
                    }
                } catch {
                    return { box: null as ProviderBoxScore | null, outage: true }
                }
            },
        )

        const boxScores: ProviderBoxScore[] = []
        let outageHit = false
        for (const result of fetched) {
            if (result.outage) outageHit = true
            else if (result.box) boxScores.push(result.box)
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
