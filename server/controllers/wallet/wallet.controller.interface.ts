export interface IWalletController {
    getWallet(userId: string): Promise<Response>
    getCreditsSummary(userId: string): Promise<Response>
    getPacks(): Promise<Response>
    getPricing(): Promise<Response>
}
