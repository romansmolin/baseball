export interface IGamesController {
    getUpcomingGames(searchParams: URLSearchParams): Promise<Response>
    getGameDetail(gamePkParam: string, leagueParam: string | null): Promise<Response>
}
