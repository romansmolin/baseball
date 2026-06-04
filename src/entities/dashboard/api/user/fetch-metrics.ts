import { httpClient } from '@/shared/api/http-client'
import type { DashboardMetrics } from '@/shared/dashboard'

export const fetchMetrics = async (): Promise<DashboardMetrics> => {
    return httpClient.get<DashboardMetrics>('/api/me/metrics')
}
