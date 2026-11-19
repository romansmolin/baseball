import { buildAnalyticsController } from '../../../../../../server/services/analytics/analytics.composition'

const analyticsController = buildAnalyticsController()

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    return analyticsController.getPlayerAnalytics(id, searchParams)
}
