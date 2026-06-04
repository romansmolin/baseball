import { TeamsController } from '../../../../server/controllers/teams/teams.controller'
import { getSportsProvider } from '../../../../server/providers/sports-provider.factory'
import { TeamsService } from '../../../../server/services/teams/teams.service'

const teamsController = new TeamsController(new TeamsService(getSportsProvider()))

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    return teamsController.list(searchParams)
}
