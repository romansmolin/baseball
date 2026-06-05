import { httpClient } from '@/shared/api/http-client'
import { withErrorHandling } from '@/shared/api/with-error-handling'
import type { CheckoutResponse, CreditPack, WalletData } from '@/shared/wallet'

export const fetchWallet = withErrorHandling(
    async (): Promise<WalletData> => httpClient.get<WalletData>('/api/wallet'),
)

export const fetchCreditPacks = withErrorHandling(
    async (): Promise<CreditPack[]> => httpClient.get<CreditPack[]>('/api/wallet/packs'),
)

export const createCheckout = withErrorHandling(
    async (credits: number): Promise<CheckoutResponse> =>
        httpClient.post<CheckoutResponse>('/api/payments/checkout', { credits }),
)
