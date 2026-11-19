import type { PlayerProjection, ProjectionsResult } from '../model/projection.type'

import type { ProjectionDto, ProjectionsResponseDto } from './types'

export function mapProjectionToModel(dto: ProjectionDto): PlayerProjection {
    return {
        points: dto.points,
        games: dto.games,
        starts: dto.starts,
        confidence: dto.confidence,
        basis: dto.basis,
        reason: dto.reason,
    }
}

export function mapProjectionsToModel(dto: ProjectionsResponseDto): ProjectionsResult {
    return {
        basis: dto.basis,
        projections: new Map(
            Object.entries(dto.projections).map(([id, projection]) => [Number(id), mapProjectionToModel(projection)]),
        ),
    }
}
