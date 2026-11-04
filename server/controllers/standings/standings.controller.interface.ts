export interface IStandingsController {
    get(searchParams: URLSearchParams): Promise<Response>
}
