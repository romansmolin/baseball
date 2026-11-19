// A team's season record and its last ten games, used as a strength signal.
export interface ProviderTeamStanding {
    teamId: number
    wins: number
    losses: number
    lastTen: { wins: number; losses: number } | null
}
