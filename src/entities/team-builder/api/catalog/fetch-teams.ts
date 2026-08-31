import { httpClient } from '@/shared/api/http-client'
import type { BuilderTeam } from '@/shared/team-builder'

interface ProviderTeamDto {
    id: number
    name: string
    abbreviation: string
    locationName: string | null
    teamName: string | null
    league: string | null
    division: string | null
    venueName: string | null
    active: boolean
}

interface TeamsListResponseDto {
    items: ProviderTeamDto[]
}

function mapProviderTeamToBuilderTeam(dto: ProviderTeamDto): BuilderTeam {
    return {
        id: dto.id,
        name: dto.name,
        abbreviation: dto.abbreviation,
        locationName: dto.locationName,
        league: dto.league,
        division: dto.division,
    }
}

// Teams are fetched per league slug — the API scopes the response to that
// league's sport level, so the client no longer filters a flat MLB list.
export async function fetchBuilderTeams(leagueSlug: string): Promise<BuilderTeam[]> {
    const response = await httpClient.get<TeamsListResponseDto>(
        `/api/teams?league=${encodeURIComponent(leagueSlug)}&activeOnly=true`,
    )
    return response.items.map(mapProviderTeamToBuilderTeam)
}
