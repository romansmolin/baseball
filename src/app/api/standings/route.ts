import { StandingsController } from '../../../../server/controllers/standings/standings.controller'
import { StandingsService } from '../../../../server/services/standings/standings.service'

const standingsController = new StandingsController(new StandingsService())

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    return standingsController.get(searchParams)
}
