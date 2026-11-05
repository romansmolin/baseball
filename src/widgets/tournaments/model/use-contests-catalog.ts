'use client'

import { useState } from 'react'

import { useContestCatalogData, type FetchContestCatalogParams } from '@/entities/tournaments'
import type { ContestCatalogKind } from '@/shared/tournaments'
import type { ContestTab } from './contest-ticket'

export const CONTESTS_PAGE_SIZE = 20

const TAB_QUERY: Record<ContestTab, Pick<FetchContestCatalogParams, 'view' | 'phase'>> = {
    open: { view: 'current', phase: 'open' },
    live: { view: 'current', phase: 'live' },
    results: { view: 'history' },
}

export type ContestKindFilter = ContestCatalogKind | 'ALL'

export function useContestsCatalog(initialTab: ContestTab) {
    const [tab, setTab] = useState<ContestTab>(initialTab)
    const [kind, setKind] = useState<ContestKindFilter>('ALL')
    const [searchText, setSearchText] = useState('')
    const [search, setSearch] = useState('')
    const [offset, setOffset] = useState(0)

    const filters = { kind, search }
    const list = useContestCatalogData({ ...TAB_QUERY[tab], ...filters, limit: CONTESTS_PAGE_SIZE, offset })
    // One row is enough for a total; these feed the counts on the tabs.
    const open = useContestCatalogData({ ...TAB_QUERY.open, ...filters, limit: 1, offset: 0 })
    const live = useContestCatalogData({ ...TAB_QUERY.live, ...filters, limit: 1, offset: 0 })
    const results = useContestCatalogData({ ...TAB_QUERY.results, ...filters, limit: 1, offset: 0 })

    return {
        tab,
        kind,
        search,
        searchText,
        offset,
        items: list.data?.items ?? [],
        total: list.data?.total ?? 0,
        counts: { open: open.data?.total, live: live.data?.total, results: results.data?.total } as Record<ContestTab, number | undefined>,
        loading: list.isLoading,
        failed: !!list.error && !list.data,
        retry: () => { void list.mutate() },
        setSearchText,
        setOffset,
        changeTab: (value: ContestTab) => { setTab(value); setOffset(0) },
        changeKind: (value: ContestKindFilter) => { setKind(value); setOffset(0) },
        submitSearch: () => { setSearch(searchText.trim()); setOffset(0) },
        clearSearch: () => { setSearch(''); setSearchText(''); setOffset(0) },
    }
}
