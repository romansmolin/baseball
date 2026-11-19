import { PerformersController } from '../../../../../server/controllers/performers/performers.controller'
import { getSportsProvider } from '../../../../../server/providers/sports-provider.factory'
import { PerformersService } from '../../../../../server/services/performers/performers.service'

const performersController = new PerformersController(new PerformersService(getSportsProvider()))

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    return performersController.getWeekly(searchParams)
}
