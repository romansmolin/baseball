export type ProjectionBasis = 'schedule' | 'season-pace'

export type ProjectionReason = 'NO_STATS' | 'INACTIVE' | 'NO_GAMES'

// Expected fantasy points for one player over the forecast period.
export interface PlayerProjection {
    // null when there is nothing to project from; `reason` says why.
    points: number | null
    games: number
    starts: number
    confidence: 'normal' | 'low'
    basis: ProjectionBasis
    reason?: ProjectionReason
}

export interface ProjectionsResult {
    basis: ProjectionBasis
    projections: Map<number, PlayerProjection>
}
