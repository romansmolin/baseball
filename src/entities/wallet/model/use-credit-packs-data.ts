import useSWR from 'swr'

import type { CreditPack } from '@/shared/wallet'

import { fetchCreditPacks } from '../api/fetch-wallet'

export function useCreditPacksData() {
    return useSWR<CreditPack[]>(['wallet', 'packs'], () => fetchCreditPacks(), {
        revalidateOnFocus: false,
    })
}
