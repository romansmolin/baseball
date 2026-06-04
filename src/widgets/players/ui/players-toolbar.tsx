'use client'

import { ArrowDown01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { cn } from '@/shared/utils'

import type { PositionFilter, SortKey } from '../model/player.type'

const POSITION_OPTIONS: { value: PositionFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'P', label: 'Pitchers' },
    { value: 'IF', label: 'Infield' },
    { value: 'OF', label: 'Outfield' },
    { value: 'C', label: 'Catcher' },
]

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
    { value: 'proj', label: 'Sort: projected pts' },
    { value: 'avg', label: 'Sort: avg pts' },
    { value: 'own', label: 'Sort: ownership' },
    { value: 'salary', label: 'Sort: salary' },
    { value: 'name', label: 'Sort: name' },
]

interface PlayersToolbarProps {
    position: PositionFilter
    sortKey: SortKey
    onPositionChange: (position: PositionFilter) => void
    onSortChange: (sort: SortKey) => void
}

export const PlayersToolbar = ({
    position,
    sortKey,
    onPositionChange,
    onSortChange,
}: PlayersToolbarProps) => (
    <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
            {POSITION_OPTIONS.map((opt) => {
                const isActive = opt.value === position
                return (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => onPositionChange(opt.value)}
                        className={cn(
                            'rounded-full px-3 py-1.5 text-sm transition-colors',
                            isActive
                                ? 'bg-primary text-primary-foreground'
                                : 'border border-foreground/15 text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                    >
                        {opt.label}
                    </button>
                )
            })}
        </div>

        <div className="relative ml-auto">
            <select
                value={sortKey}
                onChange={(e) => onSortChange(e.target.value as SortKey)}
                className="h-9 appearance-none rounded-md border border-foreground/15 bg-card py-2 pr-9 pl-3 text-sm outline-none transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
            >
                {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
            <HugeiconsIcon
                icon={ArrowDown01Icon}
                className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
        </div>
    </div>
)
