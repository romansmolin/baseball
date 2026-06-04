export interface ITeamsController {
    list(searchParams: URLSearchParams): Promise<Response>
    getById(idParam: string): Promise<Response>
    getRoster(idParam: string, searchParams: URLSearchParams): Promise<Response>
}
