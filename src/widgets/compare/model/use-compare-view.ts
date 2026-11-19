'use client'

import { useMemo, useState } from 'react'

import type { PlayerAnalytics } from '@/shared/analytics'

import { buildCompareView } from './compare-view'

export function useCompareView(players: PlayerAnalytics[]) {
    const [showAdvanced, setShowAdvanced] = useState(false)
    const view = useMemo(() => buildCompareView(players, showAdvanced), [players, showAdvanced])
    return { view, showAdvanced, toggleAdvanced: () => setShowAdvanced((on) => !on) }
}
