export interface UpcomingGame {
    gamePk: number
    gameDateUtc: string
    status: string
    awayTeamName: string
    homeTeamName: string
}

export function selectUpcomingGames(games: readonly UpcomingGame[], now: number): UpcomingGame[] {
    if (!Number.isFinite(now)) return []
    const sorted = games
        .filter(game => game.status === 'SCHEDULED' && Date.parse(game.gameDateUtc) > now)
        .sort((a, b) => Date.parse(a.gameDateUtc) - Date.parse(b.gameDateUtc) || a.gamePk - b.gamePk)
    return [...new Map(sorted.map(game => [game.gamePk, game])).values()].slice(0, 4)
}
