import type { GameLeague } from '../../../src/shared/games'
import type { PerformerDetail, WeeklyTopPerformers } from '../../../src/shared/performers'
import type { PerformerGroup } from '../../providers/dto/provider-performer.dto'

export interface IPerformersService {
    // Best hitters and pitchers by fantasy points over the last 7 days, across MLB and the winter leagues.
    getWeeklyTopPerformers(limit: number): Promise<WeeklyTopPerformers>
    // The charts behind one player's week; null when the player is unknown.
    getPerformerDetail(playerId: number, league: GameLeague, group: PerformerGroup): Promise<PerformerDetail | null>
}
