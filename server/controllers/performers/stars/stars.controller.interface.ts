export interface IStarsController {
    get(searchParams: URLSearchParams): Promise<Response>
}
