import useSWR from 'swr'

import type { ActivityEvent } from '@/shared/dashboard'
import { fetchActivity } from './fetch-activity'

export function useActivityData(limit?: number) {
    return useSWR<ActivityEvent[]>(['me', 'activity', limit ?? 10], () => fetchActivity(limit))
}
