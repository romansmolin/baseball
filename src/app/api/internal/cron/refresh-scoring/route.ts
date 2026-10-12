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

// 5 minutes — Vercel Pro caps at 300s. Hobby caps at 60s and silently truncates
// past that. Our TIME_BUDGET_MS below keeps us inside even the 60s ceiling.
export const maxDuration = 300
export const dynamic = 'force-dynamic'

// Leaves ~60s of headroom under maxDuration for the in-flight members to finish.
const TIME_BUDGET_MS = 240_000
const MEMBER_CONCURRENCY = 8

const ACTIVE_STATUSES = ['IN_SEASON', 'PLAYOFFS'] as const

export async function GET(request: Request) {
    if (!isAuthorizedCron(request)) {
        return ApiError.unauthorized().toResponse()
    }

    const startedAt = Date.now()

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
        where: { status: { in: ACTIVE_STATUSES as unknown as ('IN_SEASON' | 'PLAYOFFS')[] } },
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
        durationMs: Date.now() - startedAt,
        timedOut,
        runAtUtc: new Date(startedAt).toISOString(),
    })
}
