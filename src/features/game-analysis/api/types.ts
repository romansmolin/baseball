// Raw shape of POST /api/me/ai/game-analysis. Never leaves the api/ folder.
interface PitcherDto {
    id: number
    fullName: string
    throws: 'L' | 'R' | null
    era: number | null
    inningsPitched: number | null
}

export interface GameAnalysisResponseDto {
    output: {
        gamePk: number
        summary: string
        outlook: string
        keyFactors: Array<{ title: string; detail: string }>
        picks: Array<{
            externalPlayerId: number
            playerName: string
            role: 'start' | 'sit' | 'watch'
            reason: string
        }>
        matchup: {
            lean: 'home' | 'away' | 'toss-up'
            homeWinProbability: number | null
            confidence: 'low' | 'medium' | 'high' | null
            factors: Array<{ label: string; effect: number }>
            startsAt: string
            venue: string | null
            weather: { condition: string; tempF: number | null; wind: string } | null
            starters: { home: PitcherDto | null; away: PitcherDto | null }
        }
    }
    modelUsed: string
    tokenUsage: { inputTokens: number; outputTokens: number }
}
