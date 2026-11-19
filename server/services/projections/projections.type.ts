import type { ProjectedStats, ScoringRules } from '../../../src/shared/team-builder'
import type { ProviderPlayer } from '../../providers/dto/provider-player.dto'

// 'schedule' counts the team's real games in the period; 'season-pace' is the
// off-season stand-in (typical games per day / week / season).
export type ProjectionBasis = 'schedule' | 'season-pace'

export interface Projection {
    // null when there is nothing to project from; `reason` says why.
    points: number | null
    // Expected games (hitters, relievers) in the period.
    games: number
    // Expected starts in the period (starters only).
    starts: number
    confidence: 'normal' | 'low'
    basis: ProjectionBasis
    // Expected category stats for the period; absent when there is nothing to project from.
    stats?: ProjectedStats
    reason?: 'NO_STATS' | 'INACTIVE' | 'NO_GAMES'
}

export interface ProjectionInput {
    player: ProviderPlayer
    // The player's team games in the period.
    teamGames: number
    basis: ProjectionBasis
    // Games the team has played this season; null when unknown (availability 1).
    teamSeasonGames: number | null
    // Starts the player is announced for in the period, when known.
    announcedStarts?: number
    // Team games in the period with no probable starter announced yet; the
    // rotation estimate covers those. Omit when no announcements are known.
    unannouncedTeamGames?: number
    rules: ScoringRules
}
