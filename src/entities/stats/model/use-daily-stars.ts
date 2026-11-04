'use client'

import { useMemo, useState } from 'react'

import { useDailyStarsData } from './use-daily-stars-data'

const dayLabel = (date: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))

/** Latest finished slate: the stars with their box-score lines, and the daily score trend. */
export function useDailyStars(limit = 8) {
    const { data, error, isLoading, mutate } = useDailyStarsData(limit)
    const [openedAt] = useState(() => Date.now())

    return useMemo(() => {
        const stars = data?.stars ?? []
        const date = data?.contest?.date
        const yesterday = new Date(openedAt - 24 * 3600 * 1000).toLocaleDateString('en-CA')
        return {
            title: !date ? 'Stars of the day' : date === yesterday ? 'Yesterday’s stars' : `Stars of ${dayLabel(date, { month: 'short', day: 'numeric' })}`,
            subtitle: data?.contest?.name ?? null,
            stars,
            maxPoints: Math.max(1, ...stars.map((s) => s.fantasyPoints)),
            trend: (data?.trend ?? []).map((p) => ({ ...p, label: dayLabel(p.date, { month: 'short', day: 'numeric' }) })),
            isLoading,
            failed: !!error,
            retry: () => void mutate(),
        }
    }, [data, error, isLoading, mutate, openedAt])
}
