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

// 5 minutes — Vercel Pro caps at 300s. Hobby caps at 60s and silently truncates
// past that. Our TIME_BUDGET_MS below keeps us inside even the 60s ceiling.
export const maxDuration = 300
export const dynamic = 'force-dynamic'

const TIME_BUDGET_MS = 50_000

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

    outer: for (const tournament of tournaments) {
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

        for (const member of members) {
            if (Date.now() - startedAt > TIME_BUDGET_MS) {
                timedOut = true
                break outer
            }

            // Scoring engine reads frozen WeeklyLineup snapshots internally —
            // members without snapshots for a given week settle to 0, no
            // pre-flight guard needed here.
            await scoringService.prepareMemberWeeks(
                member.id,
                {
                    id: tournament.id,
                    startsAt: tournament.startsAt,
                    totalWeeks: tournament.totalWeeks,
                },
                rule,
                currentWeek,
            )
            membersWarmed++
        }

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
