import { useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'

import { useAIFeaturesData, useCreditsData } from '@/entities/dashboard'
import { ApiError } from '@/shared/api/api-error'

import { fetchGameAnalysis } from '../api/fetch-game-analysis'

import type { GameAnalysis } from './types'

const FEATURE_ID = 'game_analysis'
const FALLBACK_COST = 300

export function useGameAnalysis(gamePk: number, league: string) {
    const { mutate } = useSWRConfig()
    const { data: credits } = useCreditsData()
    const { data: features } = useAIFeaturesData()
    const [open, setOpen] = useState(false)
    const [isRunning, setIsRunning] = useState(false)
    const [error, setError] = useState<ApiError | undefined>(undefined)

    // A paid result is kept in the SWR cache (read-only here, no fetcher) so closing the dialog,
    // switching the tab or re-rendering the card never loses an analysis the user paid for.
    const key = ['ai', 'game-analysis', gamePk]
    const { data: analysis, mutate: store } = useSWR<GameAnalysis>(key, null)

    const cost = features?.find((f) => f.id === FEATURE_ID)?.costPerUse ?? FALLBACK_COST
    const balance = credits?.balance
    // An unknown balance never allows a spend.
    const canAfford = balance !== undefined && balance >= cost

    const run = async () => {
        setIsRunning(true)
        setError(undefined)
        try {
            await store(await fetchGameAnalysis(gamePk, league), { revalidate: false })
        } catch (cause) {
            setError(ApiError.isApiError(cause) ? cause : new ApiError(500, 'Could not analyse this game'))
        } finally {
            setIsRunning(false)
            // The balance changed if the call was charged.
            await mutate(['me', 'credits'])
        }
    }

    return { cost, balance, canAfford, open, setOpen, run, analysis: analysis ?? null, isRunning, error }
}
