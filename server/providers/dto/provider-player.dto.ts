import type { SupportedBaseballLeague } from '../../../src/shared/baseball'
import type { Position } from '../../../src/shared/sports'
import type { PaginationParams } from './provider-pagination.dto'

export interface ProviderPlayer {
    id: number
    fullName: string
    firstName: string
    lastName: string
    primaryPosition: Position
    teamId: number | null
    teamName: string | null
    teamAbbreviation: string | null
    birthDate: string | null
    age: number | null
    bats: 'L' | 'R' | 'S' | null
    throws: 'L' | 'R' | null
    jerseyNumber: string | null
    photoUrl: string | null
    active: boolean
    statsSeason?: number
    battingStats?: PlayerSeasonStatLine
    pitchingStats?: PlayerSeasonStatLine
}

export type PlayerSeasonStatLine = Record<string, string | number>

export interface ProviderPlayerFilters extends PaginationParams {
    teamId?: number
    position?: Position
    positionGroup?: import('../../../src/shared/sports').PositionGroup
    active?: boolean
    search?: string
    season?: number
    league?: SupportedBaseballLeague
}
