import useSWR from 'swr'

import type { BuilderBudget } from '@/shared/team-builder'

import { fetchBudget } from './fetch-budget'

export function useBudgetData() {
    return useSWR<BuilderBudget>(['me', 'budget'], () => fetchBudget())
}
