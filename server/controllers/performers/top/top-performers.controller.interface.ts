export interface ITopPerformersController {
    list(searchParams: URLSearchParams): Promise<Response>
}
