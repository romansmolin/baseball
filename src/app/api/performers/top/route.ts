import { TopPerformersController } from '../../../../../server/controllers/performers/top/top-performers.controller'
import { getSportsProvider } from '../../../../../server/providers/sports-provider.factory'
import { TopPerformersService } from '../../../../../server/services/performers/top/top-performers.service'

const topPerformersController = new TopPerformersController(
    new TopPerformersService(getSportsProvider()),
)

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    return topPerformersController.list(searchParams)
}
