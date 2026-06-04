export interface IPlayersController {
    list(searchParams: URLSearchParams): Promise<Response>
    getById(idParam: string): Promise<Response>
}
