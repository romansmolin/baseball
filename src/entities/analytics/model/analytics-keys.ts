// SWR key for one player's analytics; null disables the request.
export function playerAnalyticsKey(playerId: number | null, season?: number) {
    return playerId === null ? null : (['analytics', 'player', playerId, season] as const)
}
