// Weekly-lineup snapshot cron. Walks every DRAFTING / IN_SEASON / PLAYOFFS
// tournament and stamps a frozen WeeklyLineup row for the current week for
// each member who doesn't yet have one. Idempotent — existing rows are
// never overwritten (first snapshot wins; locked weeks stay frozen).
//
// Scheduled at 5 AM UTC daily — runs BEFORE the scoring refresh (6 AM UTC)
// so any newly-locked weeks have lineups in place when scoring runs.
// All-DB, no provider calls → 60s timeout is plenty.

import { ApiError } from '../../../../../../server/errors/api.error'
import { FantasyTeamRepository } from '../../../../../../server/repositories/fantasy-team/fantasy-team.repository'
import { LeagueRepository } from '../../../../../../server/repositories/league/league.repository'
import { WeeklyLineupRepository } from '../../../../../../server/repositories/weekly-lineup/weekly-lineup.repository'
import { isAuthorizedCron } from '../../../../../../server/shared/cron-auth.utils'
import { WeeklyLineupSnapshotService } from '../../../../../../server/services/weekly-lineup/weekly-lineup-snapshot.service'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    if (!isAuthorizedCron(request)) {
        return ApiError.unauthorized().toResponse()
    }

    const startedAt = Date.now()

    const snapshotService = new WeeklyLineupSnapshotService(
        new WeeklyLineupRepository(),
        new FantasyTeamRepository(),
        new LeagueRepository(),
    )

    const counts = await snapshotService.snapshotAllForCurrentWeek()

    return Response.json({
        ...counts,
        durationMs: Date.now() - startedAt,
        runAtUtc: new Date(startedAt).toISOString(),
    })
}
