import { httpClient } from '@/shared/api/http-client'
import type { BuilderBudget } from '@/shared/team-builder'

export const fetchBudget = (): Promise<BuilderBudget> =>
    httpClient.get<BuilderBudget>('/api/me/budget')
