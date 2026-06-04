import type {
    ProviderGameStatus,
    ProviderScheduledGame,
} from '../../dto/provider-schedule.dto'
import type { MlbRawScheduleGame } from '../types/mlb-schedule.raw'

export function mapMlbScheduleGameToProvider(
    raw: MlbRawScheduleGame,
): ProviderScheduledGame {
    return {
        gamePk: raw.gamePk,
        gameDateUtc: raw.gameDate,
        homeTeamId: raw.teams.home.team.id,
        awayTeamId: raw.teams.away.team.id,
        status: mapMlbDetailedStateToStatus(
            raw.status.detailedState,
            raw.status.abstractGameState,
        ),
        doubleHeader: raw.doubleHeader === 'Y' || raw.doubleHeader === 'S',
    }
}

export function mapMlbDetailedStateToStatus(
    detailed: string,
    abstract: string,
): ProviderGameStatus {
    const d = detailed?.trim() ?? ''
    const a = abstract?.trim() ?? ''

    if (d === 'Postponed') return 'POSTPONED'
    if (d === 'Cancelled' || d === 'Canceled') return 'CANCELLED'
    if (d === 'Final' || d === 'Completed Early' || d === 'Game Over') {
        return 'FINAL'
    }
    if (
        d === 'In Progress' ||
        d === 'Manager challenge' ||
        d.startsWith('Suspended')
    ) {
        return 'LIVE'
    }
    if (
        d === 'Scheduled' ||
        d === 'Pre-Game' ||
        d === 'Warmup' ||
        d === 'Delayed Start'
    ) {
        return 'SCHEDULED'
    }

    // Fall back to abstractGameState when detailedState doesn't match any
    // known label. "Preview" is the typical pre-game umbrella; "Live" and
    // "Final" cover late states we may not have enumerated above.
    if (a === 'Final') return 'FINAL'
    if (a === 'Live') return 'LIVE'
    return 'SCHEDULED'
}
