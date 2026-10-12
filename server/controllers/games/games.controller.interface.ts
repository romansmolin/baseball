export interface IGamesController {
    getUpcomingGames(searchParams: URLSearchParams): Promise<Response>
    getRecentGames(searchParams: URLSearchParams): Promise<Response>
}
