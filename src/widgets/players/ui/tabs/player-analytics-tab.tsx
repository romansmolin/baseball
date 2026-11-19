'use client'

import { ChartLineData01Icon } from '@hugeicons/core-free-icons'
import Link from 'next/link'

import { usePlayerAnalytics } from '../../model/use-player-analytics'

import { ExpectedSection, HittingSection, OutlookCard, PitchingSection, StatusPill } from './analytics-sections'
import { TabEmptyState } from './tab-empty-state'

export const PlayerAnalyticsTab = ({ playerId }: { playerId: number }) => {
    const { analytics, isLoading, error } = usePlayerAnalytics(playerId)

    if (isLoading) {
        return <div className="py-12 text-center text-sm text-muted-foreground">Loading analytics…</div>
    }
    if (error || !analytics) {
        return (
            <TabEmptyState
                icon={ChartLineData01Icon}
                title="Analytics unavailable"
                description="We could not load this player's analytics right now. Try again in a moment."
            />
        )
    }

    const noStats = !analytics.hitting && !analytics.pitching
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <StatusPill status={analytics.status} />
                <span className="text-xs text-muted-foreground">Roster status</span>
                <Link
                    href={`/compare?ids=${playerId}`}
                    className="ml-auto rounded-md border border-foreground/15 px-2.5 py-1 text-xs font-medium hover:bg-muted"
                >
                    Compare with…
                </Link>
            </div>
            <OutlookCard outlook={analytics.outlook} />
            {noStats && (
                <TabEmptyState
                    icon={ChartLineData01Icon}
                    title="No stats yet"
                    description="This player has no recorded plate appearances or innings this season."
                />
            )}
            {analytics.hitting && <HittingSection hitting={analytics.hitting} />}
            {analytics.pitching && <PitchingSection pitching={analytics.pitching} />}
            {analytics.expected && <ExpectedSection expected={analytics.expected} />}
        </div>
    )
}
