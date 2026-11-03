'use client'
import { useEffect, useState } from 'react'
import type { DailyContestMode } from '@/shared/daily-contests'
import type { ManagerPeriod } from '@/shared/community'
export function useShowcaseState(initialMode: DailyContestMode = 'LIVE') {
    const [mode, setMode] = useState<DailyContestMode>(initialMode)
    const [period, setPeriod] = useState<ManagerPeriod>('season')
    const [offset, setOffset] = useState(0)
    const changeMode = (value: DailyContestMode) => { setMode(value); setOffset(0) }
    const changePeriod = (value: ManagerPeriod) => { setPeriod(value); setOffset(0) }
    return { mode, setMode: changeMode, period, setPeriod: changePeriod, offset, setOffset }
}
export function useShowcaseClock() {
    const [now, setNow] = useState<Date | null>(null)
    useEffect(() => { const tick = () => setNow(new Date()); tick(); const timer = setInterval(tick, 15000); return () => clearInterval(timer) }, [])
    return now
}
