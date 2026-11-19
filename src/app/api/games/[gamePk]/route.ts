import { GamesController } from '../../../../../server/controllers/games/games.controller'
import { getSportsProvider } from '../../../../../server/providers/sports-provider.factory'
import { GamesService } from '../../../../../server/services/games/games.service'

const gamesController = new GamesController(new GamesService(getSportsProvider()))

export async function GET(_request: Request, { params }: { params: Promise<{ gamePk: string }> }) {
    const { gamePk } = await params
    return gamesController.getGameDetail(gamePk)
}
