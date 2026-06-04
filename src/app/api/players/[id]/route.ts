import { PlayersController } from '../../../../../server/controllers/players/players.controller'
import { getSportsProvider } from '../../../../../server/providers/sports-provider.factory'
import { PlayersService } from '../../../../../server/services/players/players.service'

const playersController = new PlayersController(new PlayersService(getSportsProvider()))

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    return playersController.getById(id)
}
