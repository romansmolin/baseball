'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'

import { useCompareData } from '@/entities/analytics'
import type { ApiError } from '@/shared/api/api-error'

import { addCompareId, parseCompareIds, removeCompareId } from './compare-logic'

// The selection lives in the URL (`?ids=1,2`), so a comparison can be shared as a link.
export function useCompare() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()

    const ids = useMemo(() => parseCompareIds(searchParams.get('ids')), [searchParams])

    const select = useCallback(
        (next: number[]) => {
            router.replace(next.length > 0 ? `${pathname}?ids=${next.join(',')}` : pathname, { scroll: false })
        },
        [router, pathname],
    )

    const { data, isLoading, error } = useCompareData(ids)

    return {
        ids,
        add: (id: number) => select(addCompareId(ids, id)),
        remove: (id: number) => select(removeCompareId(ids, id)),
        // Players come back in the order they were chosen.
        players: data?.players ?? [],
        missingIds: data?.missingIds ?? [],
        isLoading,
        error: error as ApiError | undefined,
    }
}
