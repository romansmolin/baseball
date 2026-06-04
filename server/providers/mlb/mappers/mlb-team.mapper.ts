import type { ProviderTeam } from '../../dto/provider-team.dto'
import type { MlbRawTeam } from '../types/mlb-team.raw'

export function mapMlbTeamToProviderTeam(raw: MlbRawTeam): ProviderTeam {
    return {
        id: raw.id,
        name: raw.name,
        abbreviation: raw.abbreviation,
        locationName: raw.locationName ?? null,
        teamName: raw.teamName ?? null,
        league: raw.league?.name ?? null,
        division: raw.division?.name ?? null,
        venueName: raw.venue?.name ?? null,
        active: raw.active,
    }
}
