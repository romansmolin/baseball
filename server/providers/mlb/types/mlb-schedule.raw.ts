// Raw shapes for the MLB Stats API /schedule endpoint. Captures only the
// fields the provider actually reads — anything extra stays untyped on the
// vendor side. These types are private to server/providers/mlb/ and must
// never leak past the mapper boundary.

export interface MlbRawScheduleGameStatus {
    abstractGameState: string
    detailedState: string
    codedGameState?: string
}

export interface MlbRawScheduleTeamSide {
    team: { id: number }
    // Present once a game is LIVE or FINAL.
    score?: number
}

export interface MlbRawScheduleGame {
    gamePk: number
    gameDate: string // ISO 8601
    status: MlbRawScheduleGameStatus
    teams: {
        home: MlbRawScheduleTeamSide
        away: MlbRawScheduleTeamSide
    }
    doubleHeader?: 'N' | 'Y' | 'S'
}

export interface MlbRawScheduleDate {
    date: string
    games: MlbRawScheduleGame[]
}

export interface MlbRawScheduleResponse {
    dates: MlbRawScheduleDate[]
}
