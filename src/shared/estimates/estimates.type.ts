export type Confidence = 'low' | 'medium' | 'high'

export type EstimateFactorKey =
    | 'team_strength'
    | 'home_field'
    | 'starter'
    | 'form'
    | 'park_weather'
    | 'platoon'
    | 'expected_stats'

// One reason behind an estimate. `effect` is signed: for a game it is a change in
// the home team's win probability (0.03 = +3 points); for a player it is a change
// in the 0-100 outlook score.
export interface EstimateFactor {
    key: EstimateFactorKey
    label: string
    effect: number
}

export interface GameEstimate {
    gamePk: number
    homeWinProbability: number
    confidence: Confidence
    factors: EstimateFactor[]
}

export interface PlayerOutlook {
    externalPlayerId: number
    // 0-100, or null when the player has no plate appearances or innings to judge.
    score: number | null
    confidence: Confidence
    factors: EstimateFactor[]
}
