import type { SupportedBaseballLeague } from '../../../src/shared/baseball'

// Provider-agnostic shapes for game schedule + box score data. Mirrors what
// the MLB Stats API exposes today but stays decoupled from raw vendor types.

export type ProviderGameStatus = 'SCHEDULED' | 'LIVE' | 'FINAL' | 'POSTPONED' | 'CANCELLED'

export interface ProviderScheduledGame {
    gamePk: number
    gameDateUtc: string // ISO 8601
    homeTeamId: number
    awayTeamId: number
    status: ProviderGameStatus
    doubleHeader: boolean
}

export interface ProviderBatterLine {
    externalPlayerId: number
    hits: number
    doubles: number
    triples: number
    homeRuns: number
    rbi: number
    runs: number
    stolenBases: number
    baseOnBalls: number
    strikeOuts: number
}

export interface ProviderPitcherLine {
    externalPlayerId: number
    // Normalized decimal: MLB returns "6.2" meaning 6 innings + 2 outs, which
    // becomes 6 + 2/3 here. Pure number, no string parsing downstream.
    inningsPitched: number
    strikeOuts: number
    earnedRuns: number
    win: boolean
}

export interface ProviderBoxScore {
    gamePk: number
    status: ProviderGameStatus
    batters: ProviderBatterLine[]
    pitchers: ProviderPitcherLine[]
}

export interface GetScheduleFilters {
    startDateUtc: Date
    endDateUtc: Date
    teamId?: number
    // Restrict to these teams' games (MLB Stats API accepts a teamId list).
    // Takes precedence over `teamId` when both are set.
    teamIds?: number[]
    league?: SupportedBaseballLeague
    season?: number
}
