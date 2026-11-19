export type PickRole = 'start' | 'sit' | 'watch'
export type Lean = 'home' | 'away' | 'toss-up'

export interface AnalysisPitcher {
    name: string
    era: number | null
    inningsPitched: number | null
    throws: 'L' | 'R' | null
}

export interface GameAnalysis {
    gamePk: number
    summary: string
    // Plain-words picture of the likely result.
    outlook: string
    keyFactors: Array<{ title: string; detail: string }>
    picks: Array<{ playerId: number; playerName: string; role: PickRole; reason: string }>
    matchup: {
        lean: Lean
        homeWinProbability: number | null
        confidence: 'low' | 'medium' | 'high' | null
        // Signed change in the home team's win probability (0.03 = +3 points).
        factors: Array<{ label: string; effect: number }>
        weather: { condition: string; tempF: number | null; wind: string } | null
        starters: { home: AnalysisPitcher | null; away: AnalysisPitcher | null }
    }
}
