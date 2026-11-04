'use client'

import { useState } from 'react'

import { useStandingsData } from '@/entities/stats'
import { STANDINGS_SOURCES } from '@/shared/stats'

// October to January is the winter season, so open on a winter league then and on MLB otherwise.
const defaultLeague = (month: number) => (month >= 9 || month === 0 ? 'winter-lvbp' : 'mlb')

export function useStandingsPicker() {
    const [league, setLeague] = useState(() => defaultLeague(new Date().getMonth()))
    const { data, error, isLoading, mutate } = useStandingsData(league)

    return {
        league,
        setLeague,
        sources: STANDINGS_SOURCES,
        groups: data?.groups ?? [],
        season: data?.season ?? null,
        isLoading,
        failed: !!error,
        retry: () => void mutate(),
    }
}
