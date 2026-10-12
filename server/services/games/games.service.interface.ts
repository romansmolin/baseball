import type { UpcomingGameRecord } from '../../../src/shared/games'

export interface IGamesService {
    // Returns the next N games starting from now() across a multi-day window.
    // Excludes games already FINAL or CANCELLED.
    getUpcomingGames(limit: number): Promise<UpcomingGameRecord[]>
    // Games that are LIVE or FINAL from the last few days, newest first.
    getRecentGames(limit: number): Promise<UpcomingGameRecord[]>
}
