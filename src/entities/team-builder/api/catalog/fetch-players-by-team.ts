import { getBaseballLeague } from '@/shared/baseball'
import { httpClient } from '@/shared/api/http-client'
import {
    providerPositionToPoolPosition,
    type PoolPlayer,
    type PoolPosition,
} from '@/shared/team-builder'

// A 40-man roster plus a margin; stops a runaway league-wide query.
const MAX_POOL_PLAYERS = 60
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
    // Season stats are absent for players with no games this season.
    battingStats?: { plateAppearances?: number } | null
    pitchingStats?: { inningsPitched?: string } | null
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

function mapProviderPlayerToPoolPlayer(
    dto: ProviderPlayerDto,
    leagueSlug: string,
    leagueColor: string,
): PoolPlayer {
    return {
        id: dto.id,
        name: dto.fullName,
        pos: providerPositionToPoolPosition(dto.primaryPosition),
        team: dto.teamAbbreviation ?? '—',
        leagueSlug,
        leagueColor,
        // Real projections come from the projections entity; no salaries in Points.
        salary: null,
        proj: null,
        photoUrl: dto.photoUrl,
        hasSeasonStats:
            (dto.battingStats?.plateAppearances ?? 0) > 0 || parseFloat(dto.pitchingStats?.inningsPitched ?? '0') > 0,
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

    // The players endpoint serves at most 10 per page, so a whole roster takes
    // several pages: the first tells us how many, the rest load in parallel.
    const first = await httpClient.get<PlayersListResponseDto>(`/api/players?${params.toString()}`)
    const pageSize = first.limit > 0 ? first.limit : first.items.length
    const offsets: number[] = []
    for (let offset = first.offset + pageSize; pageSize > 0 && offset < Math.min(first.total, MAX_POOL_PLAYERS); offset += pageSize) {
        offsets.push(offset)
    }
    const rest = await Promise.all(
        offsets.map((offset) => {
            const next = new URLSearchParams(params)
            next.set('offset', String(offset))
            return httpClient.get<PlayersListResponseDto>(`/api/players?${next.toString()}`)
        }),
    )

    let items = [first, ...rest]
        .flatMap((page) => page.items)
        .map((dto) => mapProviderPlayerToPoolPlayer(dto, filters.leagueSlug, leagueColor))

    // For positions backed by multiple provider positions (P → SP/RP), filter client-side.
    if (filters.position) {
        items = items.filter((p) => p.pos === filters.position)
    }

    return items
}
