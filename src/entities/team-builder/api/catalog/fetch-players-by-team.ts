import { getBaseballLeague } from '@/shared/baseball'
import { httpClient } from '@/shared/api/http-client'
import {
    providerPositionToPoolPosition,
    type PoolPlayer,
    type PoolPosition,
} from '@/shared/team-builder'

const FALLBACK_LEAGUE_COLOR = '#3b82f6'

type ProviderPosition = 'SP' | 'RP' | 'C' | '1B' | '2B' | '3B' | 'SS' | 'OF' | 'DH'

interface ProviderPlayerDto {
    id: number
    fullName: string
    firstName: string
    lastName: string
    primaryPosition: ProviderPosition
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

interface PlayersListResponseDto {
    items: ProviderPlayerDto[]
    total: number
    limit: number
    offset: number
}

export interface PlayersByTeamFilters {
    leagueSlug: string
    teamId?: number
    search?: string
    position?: PoolPosition
}

const POOL_POSITION_TO_PROVIDER_POSITIONS: Record<PoolPosition, ProviderPosition[]> = {
    P: ['SP', 'RP'],
    C: ['C'],
    '1B': ['1B'],
    '2B': ['2B'],
    '3B': ['3B'],
    SS: ['SS'],
    OF: ['OF'],
}

/**
 * FAUX salary/projection values — deterministic from player.id.
 * Replace once the scoring engine lands.
 */
function fauxSalaryAndProjection(id: number): { salary: number; proj: number } {
    const absId = Math.abs(id)
    const salary = 3000 + (absId % 8) * 1000
    const proj = Number((8 + (absId % 13) * 0.7).toFixed(1))
    return { salary, proj }
}

function mapProviderPlayerToPoolPlayer(
    dto: ProviderPlayerDto,
    leagueSlug: string,
    leagueColor: string,
): PoolPlayer {
    const { salary, proj } = fauxSalaryAndProjection(dto.id)
    return {
        id: dto.id,
        name: dto.fullName,
        pos: providerPositionToPoolPosition(dto.primaryPosition),
        team: dto.teamAbbreviation ?? '—',
        leagueSlug,
        leagueColor,
        salary,
        proj,
        photoUrl: dto.photoUrl,
    }
}

export async function fetchPlayersByTeam(
    filters: PlayersByTeamFilters,
): Promise<PoolPlayer[]> {
    const leagueColor = getBaseballLeague(filters.leagueSlug)?.color ?? FALLBACK_LEAGUE_COLOR

    const params = new URLSearchParams()
    params.set('league', filters.leagueSlug)
    if (filters.teamId != null) params.set('teamId', String(filters.teamId))
    if (filters.search) params.set('search', filters.search)
    if (filters.position) {
        const providerPositions = POOL_POSITION_TO_PROVIDER_POSITIONS[filters.position]
        if (providerPositions.length === 1) {
            params.set('position', providerPositions[0])
        }
    }

    const url = `/api/players?${params.toString()}`

    const response = await httpClient.get<PlayersListResponseDto>(url)

    let items = response.items.map((dto) =>
        mapProviderPlayerToPoolPlayer(dto, filters.leagueSlug, leagueColor),
    )

    // For positions backed by multiple provider positions (P → SP/RP), filter client-side.
    if (filters.position) {
        items = items.filter((p) => p.pos === filters.position)
    }

    return items
}
