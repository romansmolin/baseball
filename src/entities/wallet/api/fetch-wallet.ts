import { httpClient } from '@/shared/api/http-client'
import { withErrorHandling } from '@/shared/api/with-error-handling'
import type { CheckoutResponse, CreditPack, CreditPricing, WalletData } from '@/shared/wallet'

export const fetchWallet = withErrorHandling(
    async (): Promise<WalletData> => httpClient.get<WalletData>('/api/wallet'),
)

export const fetchCreditPacks = withErrorHandling(
    async (): Promise<CreditPack[]> => httpClient.get<CreditPack[]>('/api/wallet/packs'),
)

export const fetchCreditPricing = withErrorHandling(
    async (): Promise<CreditPricing> => httpClient.get<CreditPricing>('/api/wallet/pricing'),
)

export const createCheckout = withErrorHandling(
    async (credits: number): Promise<CheckoutResponse> =>
        httpClient.post<CheckoutResponse>('/api/payments/checkout', { credits }),
)

// Custom top-up: we send only what the user wants to spend — the server derives
// the credits from its own rate ladder.
export const createCustomCheckout = withErrorHandling(
    async (amountCents: number): Promise<CheckoutResponse> =>
        httpClient.post<CheckoutResponse>('/api/payments/checkout', { amountCents }),
)
