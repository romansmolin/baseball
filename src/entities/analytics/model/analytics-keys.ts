// SWR key for one player's analytics; null disables the request.
export function playerAnalyticsKey(playerId: number | null, season?: number) {
    return playerId === null ? null : (['analytics', 'player', playerId, season] as const)
}

// SWR key for a compare request; needs at least two players, otherwise null (no request).
export function compareKey(playerIds: number[]) {
    return playerIds.length < 2 ? null : (['analytics', 'compare', playerIds.join(',')] as const)
}
