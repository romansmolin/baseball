'use client'

import { Cancel01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/utils'

import type { League, SortKey, StatusFilter } from '../model/contest.type'

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'live', label: 'Live' },
    { value: 'open', label: 'Open' },
    { value: 'soon', label: 'Soon' },
    { value: 'free', label: 'Free' },
]

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
    { value: 'prize', label: 'Sort: prize' },
    { value: 'entryFee', label: 'Sort: entry fee' },
    { value: 'lockSoon', label: 'Sort: locks soon' },
    { value: 'fillPct', label: 'Sort: fill %' },
]

interface ContestsToolbarProps {
    selectedLeague: League | null
    statusFilter: StatusFilter
    sortKey: SortKey
    leagues: League[]
    onClearLeague: () => void
    onSelectLeague: (slug: string | null) => void
    onStatusChange: (status: StatusFilter) => void
    onSortChange: (sort: SortKey) => void
}

export const ContestsToolbar = ({
    selectedLeague,
    statusFilter,
    sortKey,
    leagues,
    onClearLeague,
    onSelectLeague,
    onStatusChange,
    onSortChange,
}: ContestsToolbarProps) => (
    <div className="flex flex-wrap items-center gap-3 border-b border-foreground/10 p-4">
        {/* Mobile-only league picker — sidebar is hidden under lg */}
        <select
            value={selectedLeague?.slug ?? ''}
            onChange={(e) => onSelectLeague(e.target.value === '' ? null : e.target.value)}
            className="h-8 rounded-full border border-foreground/15 bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 lg:hidden"
        >
            <option value="">All leagues</option>
            {leagues.map((league) => (
                <option key={league.slug} value={league.slug}>
                    {league.name}
                </option>
            ))}
        </select>

        {/* Desktop-only active-league chip */}
        <div className="hidden items-center gap-2 lg:flex">
            {selectedLeague ? (
                <button
                    type="button"
                    onClick={onClearLeague}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary transition-colors hover:bg-primary/15"
                >
                    <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: selectedLeague.dotColor }}
                    />
                    {selectedLeague.name}
                    <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
                </button>
            ) : (
                <span className="rounded-full border border-foreground/15 px-3 py-1 text-sm text-muted-foreground">
                    All leagues
                </span>
            )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_OPTIONS.map((opt) => {
                const isActive = opt.value === statusFilter
                return (
                    <Button
                        key={opt.value}
                        size="sm"
                        variant={isActive ? 'default' : 'outline'}
                        onClick={() => onStatusChange(opt.value)}
                        className={cn(!isActive && 'border-foreground/15')}
                    >
                        {opt.label}
                    </Button>
                )
            })}
        </div>

        <select
            value={sortKey}
            onChange={(e) => onSortChange(e.target.value as SortKey)}
            className="ml-auto h-8 rounded-full border border-foreground/15 bg-background px-3 text-sm transition-colors outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
        >
            {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
    </div>
)
