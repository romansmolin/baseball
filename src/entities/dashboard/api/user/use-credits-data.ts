import useSWR from 'swr'

import type { CreditsSummary } from '@/shared/dashboard'
import { fetchCredits } from './fetch-credits'

export function useCreditsData() {
    return useSWR<CreditsSummary>(['me', 'credits'], () => fetchCredits())
}
