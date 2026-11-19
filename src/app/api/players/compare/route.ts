import { buildAnalyticsController } from '../../../../../server/services/analytics/analytics.composition'

const analyticsController = buildAnalyticsController()

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    return analyticsController.comparePlayers(searchParams)
}
