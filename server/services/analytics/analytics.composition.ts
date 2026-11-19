import { AnalyticsController } from '../../controllers/analytics/analytics.controller'
import { fetchSavantExpectedStats } from '../../providers/savant/savant.client'
import { getSportsProvider } from '../../providers/sports-provider.factory'

import { AnalyticsService } from './analytics.service'

export function buildAnalyticsController(): AnalyticsController {
    return new AnalyticsController(new AnalyticsService(getSportsProvider(), fetchSavantExpectedStats))
}
