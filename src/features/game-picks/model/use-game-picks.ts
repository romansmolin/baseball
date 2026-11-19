'use client'

import { useState } from 'react'
import { useSWRConfig } from 'swr'
import useSWRMutation from 'swr/mutation'

import { useAIFeaturesData, useCreditsData } from '@/entities/dashboard'
import { useMyTeamsData } from '@/entities/my-teams'
import type { ApiError } from '@/shared/api/api-error'

import { fetchGamePicks } from '../api/fetch-game-picks'

import { checkCredits } from './credit-check'
import type { GamePicks } from './types'

const FALLBACK_COST = 20
const FEATURE_ID = 'game_picks'

export function useGamePicks(gamePk: number) {
    const { mutate } = useSWRConfig()
    const { data: credits } = useCreditsData()
    const { data: features } = useAIFeaturesData()
    const { data: myTeams } = useMyTeamsData()

    const [teamId, setTeamId] = useState<string | undefined>(undefined)
    const [confirming, setConfirming] = useState(false)

    const cost = features?.find((f) => f.id === FEATURE_ID)?.costPerUse ?? FALLBACK_COST
    const { canAfford, shortBy } = checkCredits(credits?.balance, cost)

    const mutation = useSWRMutation<GamePicks, ApiError, readonly [string, string, number], { teamId?: string }>(
        ['ai', 'game-picks', gamePk],
        (_key, { arg }) => fetchGamePicks({ gamePk, teamId: arg.teamId }),
    )

    const run = async () => {
        setConfirming(false)
        try {
            await mutation.trigger({ teamId })
        } finally {
            // The balance changed if the call was charged.
            await mutate(['me', 'credits'])
        }
    }

    return {
        cost,
        balance: credits?.balance,
        canAfford,
        shortBy,
        teams: myTeams?.teams ?? [],
        teamId,
        setTeamId,
        confirming,
        askToConfirm: () => setConfirming(true),
        cancelConfirm: () => setConfirming(false),
        run,
        picks: mutation.data ?? null,
        isRunning: mutation.isMutating,
        error: mutation.error,
    }
}
