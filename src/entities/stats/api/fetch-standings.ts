import { httpClient } from '@/shared/api/http-client'
import { withErrorHandling } from '@/shared/api/with-error-handling'
import type { Standings } from '@/shared/stats'

export const fetchStandings = withErrorHandling(async (league: string): Promise<Standings> => {
    return httpClient.get<Standings>(`/api/standings?league=${encodeURIComponent(league)}`)
})
