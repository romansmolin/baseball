import { PlayersController } from '../../../../server/controllers/players/players.controller'
import { getSportsProvider } from '../../../../server/providers/sports-provider.factory'
import { PlayersService } from '../../../../server/services/players/players.service'

const playersController = new PlayersController(new PlayersService(getSportsProvider()))

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    return playersController.list(searchParams)
}
