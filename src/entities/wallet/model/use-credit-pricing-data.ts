import useSWR from 'swr'

import type { CreditPricing } from '@/shared/wallet'

import { fetchCreditPricing } from '../api/fetch-wallet'

export function useCreditPricingData() {
    return useSWR<CreditPricing>(['wallet', 'pricing'], () => fetchCreditPricing(), {
        revalidateOnFocus: false,
    })
}
