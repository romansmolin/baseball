export type UpcomingGameStatus = 'SCHEDULED' | 'LIVE' | 'FINAL' | 'POSTPONED' | 'CANCELLED'

export interface UpcomingGameTeam {
    id: number
    name: string
    // Short nickname like "Yankees" / "Red Sox". May be null if the upstream
    // provider didn't supply it; UI should fall back to abbreviation.
    teamName: string | null
    abbreviation: string
}

export interface UpcomingGameRecord {
    gamePk: number
    gameDateUtc: string // ISO 8601
    status: UpcomingGameStatus
    homeTeam: UpcomingGameTeam
    awayTeam: UpcomingGameTeam
    venueName: string | null
    // Runs; null until the game has started.
    homeScore: number | null
    awayScore: number | null
}
