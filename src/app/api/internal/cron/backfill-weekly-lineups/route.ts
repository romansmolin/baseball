// One-off repair, NOT scheduled in vercel.json. Creates the WeeklyLineup rows a
// member should have had for past weeks (from their CURRENT roster) and drops
// the cached "not joined yet" zero scores so the scoring cron recomputes them.
//
// Dry run by default — nothing is written without `?apply=1`.
//   ?apply=1           write changes
//   ?ignoreJoinDate=1  also fill weeks before the member's join (seeded data)
// Idempotent and time-boxed: re-run until `timedOut` is false.

import { ApiError } from '../../../../../../server/errors/api.error'
import { FantasyTeamRepository } from '../../../../../../server/repositories/fantasy-team/fantasy-team.repository'
import { LeagueRepository } from '../../../../../../server/repositories/league/league.repository'
import { WeeklyLineupRepository } from '../../../../../../server/repositories/weekly-lineup/weekly-lineup.repository'
import { isAuthorizedCron } from '../../../../../../server/shared/cron-auth.utils'
import { WeeklyLineupSnapshotService } from '../../../../../../server/services/weekly-lineup/weekly-lineup-snapshot.service'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

const TIME_BUDGET_MS = 240_000

export async function GET(request: Request) {
    if (!isAuthorizedCron(request)) {
        return ApiError.unauthorized().toResponse()
    }

    const { searchParams } = new URL(request.url)
    const startedAt = Date.now()

    const snapshotService = new WeeklyLineupSnapshotService(
        new WeeklyLineupRepository(),
        new FantasyTeamRepository(),
        new LeagueRepository(),
    )

    const result = await snapshotService.backfillMissingWeeks({
        apply: searchParams.get('apply') === '1',
        ignoreJoinDate: searchParams.get('ignoreJoinDate') === '1',
        budgetMs: TIME_BUDGET_MS,
    })

    return Response.json({ ...result, durationMs: Date.now() - startedAt })
}
