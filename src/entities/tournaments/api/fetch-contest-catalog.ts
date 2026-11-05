import { httpClient } from '@/shared/api/http-client'
import { withErrorHandling } from '@/shared/api/with-error-handling'
import type { ContestCatalogKind, ContestCatalogPage, ContestCatalogPhase, ContestCatalogView } from '@/shared/tournaments'

export interface FetchContestCatalogParams {
    view: ContestCatalogView
    phase?: ContestCatalogPhase
    kind?: ContestCatalogKind | 'ALL'
    search?: string
    limit?: number
    offset?: number
}

export const fetchContestCatalog = withErrorHandling(async (params: FetchContestCatalogParams): Promise<ContestCatalogPage> => {
    const search = new URLSearchParams({ view: params.view })
    if (params.phase) search.set('phase', params.phase)
    if (params.kind && params.kind !== 'ALL') search.set('kind', params.kind)
    if (params.search?.trim()) search.set('search', params.search.trim())
    if (params.limit != null) search.set('limit', String(params.limit))
    if (params.offset != null) search.set('offset', String(params.offset))
    return httpClient.get<ContestCatalogPage>(`/api/contests/catalog?${search.toString()}`)
})
