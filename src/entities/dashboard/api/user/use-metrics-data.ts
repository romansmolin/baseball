import useSWR from 'swr'

import type { DashboardMetrics } from '@/shared/dashboard'
import { fetchMetrics } from './fetch-metrics'

export function useMetricsData() {
    return useSWR<DashboardMetrics>(['me', 'metrics'], () => fetchMetrics())
}
