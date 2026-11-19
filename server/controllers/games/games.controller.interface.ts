export interface IGamesController {
    getUpcomingGames(searchParams: URLSearchParams): Promise<Response>
    getGameDetail(gamePkParam: string): Promise<Response>
}
