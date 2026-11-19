export interface ProjectionDto {
    points: number | null
    games: number
    starts: number
    confidence: 'normal' | 'low'
    basis: 'schedule' | 'season-pace'
    reason?: 'NO_STATS' | 'INACTIVE' | 'NO_GAMES'
}

export interface ProjectionsResponseDto {
    basis: 'schedule' | 'season-pace'
    projections: Record<string, ProjectionDto>
}
