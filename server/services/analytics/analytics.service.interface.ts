import type { CompareResult, PlayerAnalytics } from '../../../src/shared/analytics'

export interface IAnalyticsService {
    getPlayerAnalytics(id: number, season: number): Promise<PlayerAnalytics | null>
    comparePlayers(ids: number[], season: number): Promise<CompareResult>
}
