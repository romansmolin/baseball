import type { GameEstimate } from '@/shared/estimates'

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
    // Which baseball league the game belongs to (MLB, Winter Leagues, ...).
    leagueSlug?: string
    homeTeam: UpcomingGameTeam
    awayTeam: UpcomingGameTeam
    venueName: string | null
    // Runs; null until the game has started.
    homeScore: number | null
    awayScore: number | null
    homeProbablePitcher: string | null
    awayProbablePitcher: string | null
    // Only for games that have not started; null when the data to estimate is missing.
    estimate: GameEstimate | null
}

// Leagues the games hub covers: MLB, and the winter leagues that play while MLB is off-season.
export const GAME_LEAGUES = ['mlb', 'winter-leagues'] as const
export type GameLeague = (typeof GAME_LEAGUES)[number]
