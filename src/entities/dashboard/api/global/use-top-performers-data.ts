import useSWR from 'swr'

import { fetchTopPerformers } from './fetch-top-performers'

export function useTopPerformersData(limit?: number) {
    return useSWR(['performers', 'top', limit ?? 5], () => fetchTopPerformers(limit))
}
