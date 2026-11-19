import type { BaseballProviderLeague } from '../../../src/shared/baseball'

import type { StatLine } from './provider-player-profile.dto'

export type PerformerGroup = 'hitting' | 'pitching'

export interface GetPerformersFilters {
    startDateUtc: Date
    endDateUtc: Date
    league: BaseballProviderLeague
    group: PerformerGroup
    // How many rows to load, ordered by the group's volume stat (total bases / strikeouts).
    limit: number
    season?: number
}

// One player's combined stat line over the requested date range.
export interface ProviderPerformerLine {
    playerId: number
    fullName: string
    teamId: number
    teamName: string
    position: string | null
    stat: StatLine
}

export interface GetPerformerLogFilters {
    playerId: number
    league: BaseballProviderLeague
    group: PerformerGroup
    season?: number
}

export interface ProviderPerformerGame {
    date: string
    opponentName: string
    stat: StatLine
}

// A player's game-by-game log and season totals within one league.
export interface ProviderPerformerLog {
    games: ProviderPerformerGame[]
    season: StatLine | null
}
