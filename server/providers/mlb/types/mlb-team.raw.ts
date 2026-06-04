export interface MlbRawTeam {
    id: number
    name: string
    abbreviation: string
    locationName?: string
    teamName?: string
    league?: { id?: number; name?: string }
    division?: { id?: number; name?: string }
    venue?: { id?: number; name?: string }
    active: boolean
}

export interface MlbRawTeamsResponse {
    teams: MlbRawTeam[]
}
