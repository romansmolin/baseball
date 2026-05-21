'use client'

import { Clock01Icon, LiveStreaming01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { cn } from '@/shared/utils'

import type { Contest, League } from '../model/contest.type'

interface ContestCardProps {
    contest: Contest
    league: League | undefined
    isSelected: boolean
    onSelect: () => void
}

export const ContestCard = ({ contest, league, isSelected, onSelect }: ContestCardProps) => {
    const fillPct = Math.min(100, (contest.currentEntries / contest.maxEntries) * 100)
    const isFree = contest.entryFeeCredits === 0

    return (
        <button
            type="button"
            onClick={onSelect}
            className={cn(
                'group flex flex-col gap-3 rounded-xl border bg-card p-4 text-left transition-all hover:border-foreground/20',
                isSelected
                    ? 'border-primary/40 ring-2 ring-primary/30'
                    : 'border-foreground/10',
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="font-medium">{contest.name}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                        {league?.name ?? contest.leagueSlug.toUpperCase()} · {contest.format}
                    </div>
                </div>
                <div className="text-right">
                    <div className="font-anton text-lg text-primary">
                        {contest.prizeCredits.toLocaleString()} cr
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {isFree ? 'Free entry' : `${contest.entryFeeCredits} cr entry`}
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
                <StatusPill status={contest.status} />
                <FormatPill format={contest.format} />
                {isFree && <FreePill />}
            </div>

            <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                        {contest.currentEntries}/{contest.maxEntries} entries
                    </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${fillPct}%` }}
                    />
                </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <HugeiconsIcon icon={Clock01Icon} className="size-3.5" />
                {contest.lockAtLabel}
            </div>
        </button>
    )
}

const StatusPill = ({ status }: { status: Contest['status'] }) => {
    if (status === 'live') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
                <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                <HugeiconsIcon icon={LiveStreaming01Icon} className="size-3" />
                Live
            </span>
        )
    }
    if (status === 'soon') {
        return (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                Soon
            </span>
        )
    }
    if (status === 'full') {
        return (
            <span className="rounded-full border border-foreground/15 px-2 py-0.5 text-xs text-muted-foreground">
                Full
            </span>
        )
    }
    return (
        <span className="rounded-full border border-foreground/15 px-2 py-0.5 text-xs">
            Open
        </span>
    )
}

const FormatPill = ({ format }: { format: Contest['format'] }) => (
    <span className="rounded-full border border-foreground/15 px-2 py-0.5 text-xs text-muted-foreground">
        {format}
    </span>
)

const FreePill = () => (
    <span className="rounded-full border border-primary/30 px-2 py-0.5 text-xs text-primary">
        Free
    </span>
)
