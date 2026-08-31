// Weekly tournament settlement cron. For every IN_SEASON / PLAYOFFS /
// COMPLETED tournament it (1) makes sure the weekly scores are fresh, then
// (2) pays out any completed-and-unpaid week's prize slice to that week's top
// finishers. Idempotent — a week already settled is skipped, so running this
// more often than weekly is harmless.
//
// Time-boxed well under Vercel's ceiling; partial completion is safe (the
// next run continues where this one left off).

import { ApiError } from '../../../../../../server/errors/api.error'
import { prisma } from '../../../../../../server/lib/prisma'
import { getSportsProvider } from '../../../../../../server/providers/sports-provider.factory'
import { CreditRepository } from '../../../../../../server/repositories/credit/credit.repository'
import { LeagueRepository } from '../../../../../../server/repositories/league/league.repository'
import { ScoringRuleRepository } from '../../../../../../server/repositories/scoring-rule/scoring-rule.repository'
import { TournamentsRepository } from '../../../../../../server/repositories/tournaments/tournaments.repository'
import { WeeklyLineupRepository } from '../../../../../../server/repositories/weekly-lineup/weekly-lineup.repository'
import { WeeklyScoreCacheRepository } from '../../../../../../server/repositories/weekly-score-cache/weekly-score-cache.repository'
import { isAuthorizedCron } from '../../../../../../server/shared/cron-auth.utils'
import { WeeklyScoringService } from '../../../../../../server/services/scoring/weekly-scoring.service'
import { computeTournamentCurrentWeek } from '../../../../../../server/services/tournaments/tournament-week.util'
import { TournamentSettlementService } from '../../../../../../server/services/tournaments/settlement/tournament-settlement.service'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

const TIME_BUDGET_MS = 250_000
const ACTIVE_STATUSES = ['IN_SEASON', 'PLAYOFFS', 'COMPLETED'] as const

export async function GET(request: Request) {
    if (!isAuthorizedCron(request)) {
        return ApiError.unauthorized().toResponse()
    }

    const startedAt = Date.now()

    const scoringRuleRepo = new ScoringRuleRepository()
    const cacheRepo = new WeeklyScoreCacheRepository()
    const tournamentsRepo = new TournamentsRepository()
    const leagueRepo = new LeagueRepository()
    const creditRepo = new CreditRepository()

    const scoringService = new WeeklyScoringService(
        cacheRepo,
        scoringRuleRepo,
        getSportsProvider(),
        new WeeklyLineupRepository(),
    )
    const settlementService = new TournamentSettlementService(
        leagueRepo,
        tournamentsRepo,
        cacheRepo,
        creditRepo,
    )

    const tournaments = await prisma.league.findMany({
        where: { status: { in: ACTIVE_STATUSES as unknown as ('IN_SEASON' | 'PLAYOFFS' | 'COMPLETED')[] } },
        select: {
            id: true,
            leagueSlug: true,
            externalSeasonId: true,
            startsAt: true,
            totalWeeks: true,
            status: true,
        },
    })

    let processed = 0
    let weeksSettled = 0
    let payouts = 0
    let creditsPaid = 0
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
            processed += 1
            continue
        }

        const rule = await scoringRuleRepo.findByLeagueId(tournament.id)
        if (!rule) {
            processed += 1
            continue
        }

        const scoringLeague = {
            id: tournament.id,
            leagueSlug: tournament.leagueSlug,
            season: tournament.externalSeasonId,
            startsAt: tournament.startsAt,
            totalWeeks: tournament.totalWeeks,
        }

        const members = await tournamentsRepo.findStandingsMembers(tournament.id)
        const memberIds = members.map((m) => m.id)

        // Make sure the weekly scores are current before paying anyone.
        await scoringService.warmProviderCache(scoringLeague, currentWeek, memberIds)
        for (const member of members) {
            await scoringService.prepareMemberWeeks(member.id, scoringLeague, rule, currentWeek)
        }

        const outcome = await settlementService.settleTournament(tournament.id)
        weeksSettled += outcome.weeksSettled
        payouts += outcome.payouts
        creditsPaid += outcome.creditsPaid
        processed += 1
    }

    return Response.json({
        tournamentsTotal: tournaments.length,
        tournamentsProcessed: processed,
        weeksSettled,
        payouts,
        creditsPaid,
        timedOut,
        durationMs: Date.now() - startedAt,
        runAtUtc: new Date(startedAt).toISOString(),
    })
}
