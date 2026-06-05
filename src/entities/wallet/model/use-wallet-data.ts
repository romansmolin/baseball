import useSWR from 'swr'

import type { WalletData } from '@/shared/wallet'

import { fetchWallet } from '../api/fetch-wallet'

export function useWalletData() {
    return useSWR<WalletData>(['wallet'], () => fetchWallet())
}
