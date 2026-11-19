import type { BaseballProviderLeague } from '../../../src/shared/baseball'
import type { ForecastPeriod, ScoringRules } from '../../../src/shared/team-builder'
import type { ProviderPlayer } from '../../providers/dto/provider-player.dto'

import type { Projection, ProjectionBasis } from './projections.type'

export interface ProjectTeamsInput {
    league?: BaseballProviderLeague
    teamIds: number[]
    // Teams of these players are projected as well.
    playerIds?: number[]
    period: ForecastPeriod
    rules: ScoringRules
    now?: Date
}

export interface ProjectTeamsResult {
    basis: ProjectionBasis
    projections: Record<number, Projection>
    // The players the projections were computed for (same load, reused by the AI feature).
    players: ProviderPlayer[]
}

export interface IProjectionsService {
    projectTeams(input: ProjectTeamsInput): Promise<ProjectTeamsResult>
}
