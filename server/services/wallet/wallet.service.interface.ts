import type { CreditsSummary } from '@/shared/dashboard'
import type { CreditPack, CreditPricing, WalletData } from '@/shared/wallet'

export interface IWalletService {
    getWallet(userId: string): Promise<WalletData>
    getCreditsSummary(userId: string): Promise<CreditsSummary>
    getPacks(): CreditPack[]
    getPricing(): CreditPricing
}
