import { TournamentsController } from '../../../../server/controllers/tournaments/tournaments.controller'
import { getSportsProvider } from '../../../../server/providers/sports-provider.factory'
import { ScoringRuleRepository } from '../../../../server/repositories/scoring-rule/scoring-rule.repository'
import { TournamentsRepository } from '../../../../server/repositories/tournaments/tournaments.repository'
import { WeeklyLineupRepository } from '../../../../server/repositories/weekly-lineup/weekly-lineup.repository'
import { WeeklyScoreCacheRepository } from '../../../../server/repositories/weekly-score-cache/weekly-score-cache.repository'
import { WeeklyScoringService } from '../../../../server/services/scoring/weekly-scoring.service'
import { TournamentsService } from '../../../../server/services/tournaments/tournaments.service'

const scoringRuleRepository = new ScoringRuleRepository()
const weeklyScoringService = new WeeklyScoringService(
    new WeeklyScoreCacheRepository(),
    scoringRuleRepository,
    getSportsProvider(),
    new WeeklyLineupRepository(),
)

const tournamentsController = new TournamentsController(
    new TournamentsService(
        new TournamentsRepository(),
        weeklyScoringService,
        scoringRuleRepository,
    ),
)

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    return tournamentsController.list(searchParams)
}
