// Raw shapes for the MLB Stats API /game/{gamePk}/boxscore endpoint.
// Captures only the per-player batting and pitching stat fields used by the
// scoring engine. Private to server/providers/mlb/ — must not leak past
// the mapper boundary.

export interface MlbRawBattingStats {
    hits?: number
    doubles?: number
    triples?: number
    homeRuns?: number
    rbi?: number
    runs?: number
    stolenBases?: number
    baseOnBalls?: number
    strikeOuts?: number
}

export interface MlbRawPitchingStats {
    // MLB returns this as a decimal-formatted string where the fractional
    // part counts outs (0, 1, 2). e.g. "6.2" means 6 IP + 2 outs.
    inningsPitched?: string
    strikeOuts?: number
    earnedRuns?: number
    wins?: number
}

export interface MlbRawBoxScorePlayer {
    person: { id: number; fullName: string }
    stats?: {
        batting?: MlbRawBattingStats
        pitching?: MlbRawPitchingStats
    }
}

export interface MlbRawBoxScoreTeam {
    team: { id: number }
    // Keys look like "ID660271".
    players: Record<string, MlbRawBoxScorePlayer>
}

export interface MlbRawBoxScoreResponse {
    teams: {
        home: MlbRawBoxScoreTeam
        away: MlbRawBoxScoreTeam
    }
}
