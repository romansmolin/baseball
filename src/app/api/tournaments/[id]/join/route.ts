import { TournamentsJoinsController } from '../../../../../../server/controllers/tournaments/joins/tournaments-joins.controller'
import { ApiError } from '../../../../../../server/errors/api.error'
import { FantasyTeamRepository } from '../../../../../../server/repositories/fantasy-team/fantasy-team.repository'
import { LeagueMemberRepository } from '../../../../../../server/repositories/league-member/league-member.repository'
import { LeagueRepository } from '../../../../../../server/repositories/league/league.repository'
import { WeeklyLineupRepository } from '../../../../../../server/repositories/weekly-lineup/weekly-lineup.repository'
import { TournamentsJoinsService } from '../../../../../../server/services/tournaments/joins/tournaments-joins.service'
import { WeeklyLineupSnapshotService } from '../../../../../../server/services/weekly-lineup/weekly-lineup-snapshot.service'
import { getAuthenticatedUser } from '../../../../../../server/shared/auth.utils'

const leagueRepository = new LeagueRepository()
const fantasyTeamRepository = new FantasyTeamRepository()
const weeklyLineupSnapshotService = new WeeklyLineupSnapshotService(
    new WeeklyLineupRepository(),
    fantasyTeamRepository,
    leagueRepository,
)

const tournamentsJoinsController = new TournamentsJoinsController(
    new TournamentsJoinsService(
        leagueRepository,
        new LeagueMemberRepository(),
        fantasyTeamRepository,
        weeklyLineupSnapshotService,
    ),
)

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const user = await getAuthenticatedUser()
    if (!user) {
        return ApiError.unauthorized().toResponse()
    }

    const { id } = await params

    let body: unknown
    try {
        body = await request.json()
    } catch {
        return ApiError.validationError('Invalid JSON body').toResponse()
    }

    return tournamentsJoinsController.joinTournament(body, id, user.id)
}
