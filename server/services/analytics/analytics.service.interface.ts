import type { CompareResult, PlayerAnalytics } from '../../../src/shared/analytics'
import type { BaseballProviderLeague } from '../../../src/shared/baseball'

export interface IAnalyticsService {
    getPlayerAnalytics(id: number, season: number, league?: BaseballProviderLeague): Promise<PlayerAnalytics | null>
    comparePlayers(ids: number[], season: number): Promise<CompareResult>
}
