import { useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'

import { useAIFeaturesData, useCreditsData } from '@/entities/dashboard'
import { ApiError } from '@/shared/api/api-error'
import type { PerformerDetail } from '@/shared/performers'

import { fetchPerformerAnalytics, type PerformerTarget } from '../api/fetch-performer-analytics'

const FEATURE_ID = 'performer_analytics'
const FALLBACK_COST = 100

export function usePerformerAnalytics(target: PerformerTarget) {
    const { mutate } = useSWRConfig()
    const { data: credits } = useCreditsData()
    const { data: features } = useAIFeaturesData()
    const [isRunning, setIsRunning] = useState(false)
    const [error, setError] = useState<ApiError | undefined>(undefined)

    // A paid result is kept in the SWR cache (read-only here, no fetcher) so closing the modal or
    // sliding the cards never loses analytics the user paid for.
    const key = ['performers', 'analytics', target.playerId, target.league, target.group]
    const { data: analytics, mutate: store } = useSWR<PerformerDetail>(key, null)

    const cost = features?.find((f) => f.id === FEATURE_ID)?.costPerUse ?? FALLBACK_COST
    const balance = credits?.balance
    // An unknown balance never allows a spend.
    const canAfford = balance !== undefined && balance >= cost

    const unlock = async () => {
        setIsRunning(true)
        setError(undefined)
        try {
            await store(await fetchPerformerAnalytics(target), { revalidate: false })
        } catch (cause) {
            setError(ApiError.isApiError(cause) ? cause : new ApiError(500, 'Could not load the analytics'))
        } finally {
            setIsRunning(false)
            // The balance changed if the call was charged.
            await mutate(['me', 'credits'])
        }
    }

    return { cost, balance, canAfford, analytics: analytics ?? null, isRunning, error, unlock }
}
