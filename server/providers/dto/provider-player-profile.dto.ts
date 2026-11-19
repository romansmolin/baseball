import type { ProviderPlayer } from './provider-player.dto'

export type StatLine = Record<string, string | number>

export interface ProviderStatSplit {
    key: 'vsLeft' | 'vsRight' | 'home' | 'away'
    stats: StatLine
}

export interface ProviderGameLogLine {
    date: string
    opponentTeamId: number
    stats: StatLine
}

// One stat group (hitting or pitching). Absent parts are null / empty, never zeros.
export interface ProviderStatGroup {
    season: StatLine | null
    sabermetrics: StatLine | null
    splits: ProviderStatSplit[]
    gameLog: ProviderGameLogLine[]
}

export interface ProviderPlayerStatus {
    code: string
    description: string
    available: boolean
}

// A two-way player has both groups; a player with no stats has neither.
export interface ProviderPlayerProfile {
    player: ProviderPlayer
    hitting: ProviderStatGroup | null
    pitching: ProviderStatGroup | null
    status: ProviderPlayerStatus
}
