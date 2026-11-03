'use client'
import { useState } from 'react'
import type { DailyContestView } from '@/shared/daily-contests'

export interface DailyContestsSelection { routeView: DailyContestView; view: DailyContestView; offset: number }

export function resolveDailyContestsState(state: DailyContestsSelection, routeView: DailyContestView): DailyContestsSelection {
    return state.routeView === routeView ? state : { routeView, view: routeView, offset: 0 }
}

export function useDailyContestsState(initialView: DailyContestView = 'current') {
    const [stored, setStored] = useState<DailyContestsSelection>({ routeView: initialView, view: initialView, offset: 0 })
    const current = resolveDailyContestsState(stored, initialView)
    const setView = (view: DailyContestView) => setStored({ routeView: initialView, view, offset: 0 })
    const setOffset = (offset: number) => setStored({ ...current, offset })
    return { view: current.view, setView, offset: current.offset, setOffset }
}
