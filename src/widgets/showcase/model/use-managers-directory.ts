'use client'

import { useManagersData } from '@/entities/showcase'
import type { DailyContestMode } from '@/shared/daily-contests'
import { useShowcaseState } from './use-showcase-state'

export const MANAGERS_PAGE_SIZE = 20

export function useManagersDirectory(initialMode: DailyContestMode) {
    const state = useShowcaseState(initialMode)
    const { data, isLoading, error, mutate } = useManagersData({ mode: state.mode, period: state.period, offset: state.offset, limit: MANAGERS_PAGE_SIZE, rankedOnly: true })
    const items = data?.items ?? []
    const onFirstPage = state.offset === 0

    return {
        ...state,
        // The first page opens with the three leaders as cards; the table carries on from fourth.
        podium: onFirstPage ? items.slice(0, 3) : [],
        rows: onFirstPage ? items.slice(3) : items,
        leaderPoints: onFirstPage ? items[0]?.points ?? 0 : null,
        total: data?.total ?? 0,
        isEmpty: !!data && items.length === 0,
        loading: isLoading && !data,
        failed: !!error && !data,
        retry: () => { void mutate() },
    }
}
