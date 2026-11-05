'use client'

import useSWR from 'swr'
import { fetchContestCatalog, type FetchContestCatalogParams } from '../api/fetch-contest-catalog'

export function useContestCatalogData(params: FetchContestCatalogParams) {
    const key = ['contest-catalog', params.view, params.phase ?? 'all', params.kind ?? 'ALL', params.search?.trim() ?? '', params.limit ?? 20, params.offset ?? 0] as const
    return useSWR(key, () => fetchContestCatalog(params), { keepPreviousData: true })
}
