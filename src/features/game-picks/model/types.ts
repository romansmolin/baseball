export type PickRole = 'start' | 'sit' | 'watch'

export interface GamePick {
    playerId: number
    playerName: string
    role: PickRole
    reason: string
}

export interface GamePicks {
    gamePk: number
    summary: string
    picks: GamePick[]
}
