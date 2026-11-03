// Scoring cache warmer cron. Walks every IN_SEASON / PLAYOFFS tournament and
// invokes WeeklyScoringService.prepareMemberWeeks for each member up through
// the current week. Idempotent — FINAL cache rows short-circuit; PARTIAL rows
// whose staleAt has passed are recomputed; everything else is skipped.
//
// Time-boxed at ~50s so it returns well under Vercel's serverless timeout.
// Partial completion is safe: the next invocation just continues warming
// whatever wasn't reached. We don't track a cursor — `prepareMemberWeeks`'s
// cache-first design makes "process everyone every time" cheap on warm runs.

import { ApiError } from '../../../../../../server/errors/api.error'
import { getSportsProvider } from '../../../../../../server/providers/sports-provider.factory'
import { ScoringRuleRepository } from '../../../../../../server/repositories/scoring-rule/scoring-rule.repository'
import { TournamentsRepository } from '../../../../../../server/repositories/tournaments/tournaments.repository'
import { WeeklyLineupRepository } from '../../../../../../server/repositories/weekly-lineup/weekly-lineup.repository'
import { WeeklyScoreCacheRepository } from '../../../../../../server/repositories/weekly-score-cache/weekly-score-cache.repository'
import { isAuthorizedCron } from '../../../../../../server/shared/cron-auth.utils'
import { WeeklyScoringService } from '../../../../../../server/services/scoring/weekly-scoring.service'
import { computeTournamentCurrentWeek } from '../../../../../../server/services/tournaments/tournament-week.util'
import { prisma } from '../../../../../../server/lib/prisma'
import { mapWithConcurrency } from '../../../../../../server/shared/concurrency.utils'
import { hasRecurringTournamentTable } from '../../../../../../server/repositories/recurring-tournaments/recurring-schema'
import { refreshRecurringScores } from '../../../../../../server/services/recurring-tournaments/recurring-scoring.service'
import { showcaseLeaseStore } from '../../../../../../server/services/showcase/showcase-lease.repository'
import { withShowcaseLease } from '../../../../../../server/services/showcase/showcase-lease'
import { showcaseMutationPermit } from '../../../../../../server/services/showcase/showcase-mutation-permit'

// 5 minutes — Vercel Pro caps at 300s. Hobby caps at 60s and silently truncates
// past that. Our TIME_BUDGET_MS below keeps us inside even the 60s ceiling.
export const maxDuration = 300
export const dynamic = 'force-dynamic'

// Leaves ~60s of headroom under maxDuration for the in-flight members to finish.
const TIME_BUDGET_MS = 240_000
const MEMBER_CONCURRENCY = 8
const RECURRING_BUDGET_MS = 60_000

const ACTIVE_STATUSES = ['IN_SEASON', 'PLAYOFFS'] as const

export async function GET(request: Request) {
    if (!isAuthorizedCron(request)) {
        return ApiError.unauthorized().toResponse()
    }

    const startedAt = Date.now()
    const recurringAvailable = await hasRecurringTournamentTable(prisma)

    const scoringRuleRepo = new ScoringRuleRepository()
    const cacheRepo = new WeeklyScoreCacheRepository()
    const tournamentsRepo = new TournamentsRepository()
    const sportsProvider = getSportsProvider()
    const weeklyLineupRepo = new WeeklyLineupRepository()
    const scoringService = new WeeklyScoringService(
        cacheRepo,
        scoringRuleRepo,
        sportsProvider,
        weeklyLineupRepo,
    )

    const tournaments = await prisma.league.findMany({
        where: {
            status: { in: ACTIVE_STATUSES as unknown as ('IN_SEASON' | 'PLAYOFFS')[] },
            ...(recurringAvailable ? { recurringTournament: { is: null } } : {}),
        },
        select: {
            id: true,
            leagueSlug: true,
            externalSeasonId: true,
            startsAt: true,
            endsAt: true,
            totalWeeks: true,
            status: true,
            name: true,
        },
    })

    let tournamentsProcessed = 0
    let membersWarmed = 0
    let tournamentsSkipped = 0
    let timedOut = false
    let recurringTournamentsProcessed = 0
    let recurringEntriesUpdated = 0
    let recurringLeaseAcquired: boolean | null = null

    // Recurring contests store their own source-qualified schedule and use
    // shared game snapshots. Fence their writes with a separate lease so an
    // overlapping cron cannot double-score or race lifecycle transitions.
    const recurringLeaseKey = 'showcase:recurring-scoring'
    const recurringDeadline = startedAt + RECURRING_BUDGET_MS
    if (recurringAvailable) {
        const recurringLease = await withShowcaseLease(
            showcaseLeaseStore(prisma),
            recurringLeaseKey,
            new Date(startedAt),
            async token => {
                const permit = showcaseMutationPermit(recurringLeaseKey, token)
                const recurring = await prisma.recurringTournament.findMany({
                    where: {
                        league: {
                            status: { in: ['DRAFTING', 'IN_SEASON', 'PLAYOFFS'] },
                            startsAt: { lte: new Date(startedAt) },
                        },
                    },
                    select: { leagueId: true },
                    orderBy: [{ startsAt: 'asc' }, { leagueId: 'asc' }],
                    take: 12,
                })
                for (const item of recurring) {
                    if (Date.now() + 1000 >= recurringDeadline) { timedOut = true; break }
                    try {
                        const result = await refreshRecurringScores(prisma, sportsProvider, {
                            leagueId: item.leagueId,
                            now: new Date(startedAt),
                            permit,
                            deadline: recurringDeadline,
                        })
                        recurringTournamentsProcessed++
                        recurringEntriesUpdated += result.entriesUpdated
                        if (result.timedOut) { timedOut = true; break }
                    } catch (error) {
                        if (error instanceof Error && error.name === 'WorkDeadlineError') { timedOut = true; break }
                        throw error
                    }
                }
            },
            RECURRING_BUDGET_MS + 15000,
        )
        recurringLeaseAcquired = recurringLease.acquired
    }

    for (const tournament of tournaments) {
        if (Date.now() - startedAt > TIME_BUDGET_MS) {
            timedOut = true
            break
        }

        const currentWeek = computeTournamentCurrentWeek({
            status: tournament.status,
            startsAt: tournament.startsAt,
            totalWeeks: tournament.totalWeeks,
        })
        if (currentWeek <= 0) {
            tournamentsSkipped++
            continue
        }

        const rule = await scoringRuleRepo.findByLeagueId(tournament.id)
        if (!rule) {
            tournamentsSkipped++
            continue
        }

        const members = await tournamentsRepo.findStandingsMembers(tournament.id)
        const memberIds = members.map((m) => m.id)

        // Only members with a missing/stale week need work. Settled
        // tournaments become one cheap query instead of ~500 member passes.
        const { membersNeedingRefresh } = await scoringService.summarizeScoresForMembers(
            memberIds,
            currentWeek,
        )
        if (membersNeedingRefresh.length === 0) {
            tournamentsProcessed++
            continue
        }

        const scoringLeague = {
            id: tournament.id,
            leagueSlug: tournament.leagueSlug,
            season: tournament.externalSeasonId,
            startsAt: tournament.startsAt,
            totalWeeks: tournament.totalWeeks,
        }

        // One cold pass over the week's games; every member below reads it warm.
        await scoringService.warmProviderCache(
            scoringLeague,
            currentWeek,
            membersNeedingRefresh,
        )

        await mapWithConcurrency(membersNeedingRefresh, MEMBER_CONCURRENCY, async (memberId) => {
            if (Date.now() - startedAt > TIME_BUDGET_MS) {
                timedOut = true
                return
            }
            // Scoring engine reads frozen WeeklyLineup snapshots internally —
            // members without snapshots for a given week settle to 0.
            await scoringService.prepareMemberWeeks(
                memberId,
                scoringLeague,
                rule,
                currentWeek,
            )
            membersWarmed++
        })
        if (timedOut) break

        tournamentsProcessed++
    }

    return Response.json({
        tournamentsTotal: tournaments.length,
        tournamentsProcessed,
        tournamentsSkipped,
        membersWarmed,
        recurringTournamentsProcessed,
        recurringEntriesUpdated,
        recurringLeaseAcquired,
        durationMs: Date.now() - startedAt,
        timedOut,
        runAtUtc: new Date(startedAt).toISOString(),
    })
}
