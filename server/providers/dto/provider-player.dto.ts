import type { Position } from '@/shared/sports'
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
}

export interface ProviderPlayerFilters extends PaginationParams {
    teamId?: number
    position?: Position
    search?: string
    season?: number
}
