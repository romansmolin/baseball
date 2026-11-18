// Statcast-derived expected stats for one player and season, from Baseball
// Savant. Every metric is nullable: Savant leaves a cell empty when a player
// has too few batted balls or never sprinted enough to be measured.

export type ExpectedStatsRole = 'batter' | 'pitcher'

export interface ProviderExpectedStats {
    externalPlayerId: number
    season: number
    role: ExpectedStatsRole
    xba: number | null
    xslg: number | null
    xwoba: number | null
    barrelRate: number | null
    hardHitRate: number | null
    sprintSpeed: number | null
}
