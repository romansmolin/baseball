// Raw shape of POST /api/me/ai/game-picks. Never leaves the api/ folder.
export interface GamePicksResponseDto {
    output: {
        gamePk: number
        picks: Array<{
            externalPlayerId: number
            playerName: string
            role: 'start' | 'sit' | 'watch'
            reason: string
        }>
        summary: string
    }
    modelUsed: string
    tokenUsage: { inputTokens: number; outputTokens: number }
}
