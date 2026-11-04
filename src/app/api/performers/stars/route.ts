import { StarsController } from '../../../../../server/controllers/performers/stars/stars.controller'
import { StarsService } from '../../../../../server/services/performers/stars/stars.service'

const starsController = new StarsController(new StarsService())

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    return starsController.get(searchParams)
}
