import { httpClient } from '@/shared/api/http-client'
import type { CreditsSummary } from '@/shared/dashboard'

export const fetchCredits = async (): Promise<CreditsSummary> => {
    return httpClient.get<CreditsSummary>('/api/me/credits')
}
