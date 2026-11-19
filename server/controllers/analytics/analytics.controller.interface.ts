export interface IAnalyticsController {
    getPlayerAnalytics(idParam: string, searchParams: URLSearchParams): Promise<Response>
    comparePlayers(searchParams: URLSearchParams): Promise<Response>
}
