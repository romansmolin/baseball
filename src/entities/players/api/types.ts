import type { Position } from '@/shared/sports'

import type { PlayerSeasonStatLine } from '../model/types'

// Wire shape of `GET /api/players` — mirrors the server's ProviderPlayer DTO.
// Never used outside this api/ folder.
export interface ProviderPlayerDto {
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
    statsSeason: number
    battingStats?: PlayerSeasonStatLine
    pitchingStats?: PlayerSeasonStatLine
}

export interface PlayersListResponseDto {
    items: ProviderPlayerDto[]
    total: number
    limit: number
    offset: number
}
