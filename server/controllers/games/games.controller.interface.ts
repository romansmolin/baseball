export interface IGamesController {
    getUpcomingGames(searchParams: URLSearchParams): Promise<Response>
}
