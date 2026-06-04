import { MeController } from '../../../../../../../server/controllers/me/me.controller'
import { ApiError } from '../../../../../../../server/errors/api.error'
import { getSportsProvider } from '../../../../../../../server/providers/sports-provider.factory'
import { FantasyTeamRepository } from '../../../../../../../server/repositories/fantasy-team/fantasy-team.repository'
import { LeagueMemberRepository } from '../../../../../../../server/repositories/league-member/league-member.repository'
import { LeagueRepository } from '../../../../../../../server/repositories/league/league.repository'
import { ScoringRuleRepository } from '../../../../../../../server/repositories/scoring-rule/scoring-rule.repository'
import { WeeklyLineupRepository } from '../../../../../../../server/repositories/weekly-lineup/weekly-lineup.repository'
import { WeeklyScoreCacheRepository } from '../../../../../../../server/repositories/weekly-score-cache/weekly-score-cache.repository'
import { MeService } from '../../../../../../../server/services/me/me.service'
import { WeeklyScoringService } from '../../../../../../../server/services/scoring/weekly-scoring.service'
import { getAuthenticatedUser } from '../../../../../../../server/shared/auth.utils'

const scoringRuleRepository = new ScoringRuleRepository()
const weeklyLineupRepository = new WeeklyLineupRepository()
const weeklyScoringService = new WeeklyScoringService(
    new WeeklyScoreCacheRepository(),
    scoringRuleRepository,
    getSportsProvider(),
    weeklyLineupRepository,
)

const meController = new MeController(
    new MeService(
        new FantasyTeamRepository(),
        new LeagueRepository(),
        new LeagueMemberRepository(),
        weeklyScoringService,
        scoringRuleRepository,
    ),
)

export async function PUT(
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

    return meController.updateMyTeamLineup(body, user.id, id)
}
