import type { BaseballProviderLeague } from '../../../src/shared/baseball'
import type { GameDetail } from '../../../src/shared/analytics'
import type { UpcomingGameRecord } from '../../../src/shared/games'

export interface IGamesService {
    // Returns the next N games starting from now() across a multi-day window.
    // Covers MLB and the winter leagues, so the schedule is never empty when MLB is off-season.
    // Excludes games already FINAL or CANCELLED; scheduled games carry an outcome estimate.
    getUpcomingGames(limit: number): Promise<UpcomingGameRecord[]>
    // One game with weather, probable pitchers, lineup status and the estimate; null when unknown.
    getGameDetail(gamePk: number, league?: BaseballProviderLeague): Promise<GameDetail | null>
}
