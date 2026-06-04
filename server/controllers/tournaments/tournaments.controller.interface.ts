export interface ITournamentsController {
    list(searchParams: URLSearchParams): Promise<Response>
    findById(id: string): Promise<Response>
    getStandings(id: string): Promise<Response>
}
