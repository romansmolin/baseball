export interface ProviderTeam {
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
