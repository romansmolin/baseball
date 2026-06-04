import { LeaguesController } from '../../../../server/controllers/leagues/leagues.controller'
import { LeaguesService } from '../../../../server/services/leagues/leagues.service'

const leaguesController = new LeaguesController(new LeaguesService())

export async function GET(_request: Request) {
    return leaguesController.list()
}
