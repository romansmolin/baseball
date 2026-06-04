'use client'

import { ArrowDown01Icon, GridViewIcon, Menu02Icon, StarIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { cn } from '@/shared/utils'

import type { League, SortKey, StatusFilter, ViewMode } from '../model/team.type'

const STATUS_OPTIONS: { value: StatusFilter; label: string; withIcon?: boolean }[] = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'In play' },
    { value: 'draft', label: 'Drafts' },
    { value: 'captain', label: 'Captain' },
    { value: 'favorite', label: 'Starred', withIcon: true },
]

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
    { value: 'recent', label: 'Sort: recently saved' },
    { value: 'proj', label: 'Sort: projected pts' },
    { value: 'best', label: 'Sort: best score' },
    { value: 'name', label: 'Sort: name' },
]

interface TeamsToolbarProps {
    statusFilter: StatusFilter
    sortKey: SortKey
    viewMode: ViewMode
    leagues: League[]
    selectedLeagueSlug: string | null
    onStatusChange: (status: StatusFilter) => void
    onSortChange: (sort: SortKey) => void
    onViewChange: (view: ViewMode) => void
    onSelectLeague: (slug: string | null) => void
}

export const TeamsToolbar = ({
    statusFilter,
    sortKey,
    viewMode,
    leagues,
    selectedLeagueSlug,
    onStatusChange,
    onSortChange,
    onViewChange,
    onSelectLeague,
}: TeamsToolbarProps) => (
    <div className="mb-5 flex flex-wrap items-center gap-3">
        <select
            value={selectedLeagueSlug ?? ''}
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

        <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_OPTIONS.map((opt) => {
                const isActive = opt.value === statusFilter
                return (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => onStatusChange(opt.value)}
                        className={cn(
                            'rounded-full px-3.5 py-1.5 text-sm transition-colors',
                            isActive
                                ? 'bg-primary text-primary-foreground'
                                : 'border border-foreground/15 text-muted-foreground hover:bg-muted hover:text-foreground',
                            opt.withIcon && 'inline-flex items-center gap-1.5',
                        )}
                    >
                        {opt.withIcon && <HugeiconsIcon icon={StarIcon} className="size-3.5" />}
                        {opt.label}
                    </button>
                )
            })}
        </div>

        <div className="ml-auto flex items-center gap-2">
            <div className="relative">
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

            <div className="flex items-center rounded-md border border-foreground/15 p-0.5">
                <button
                    type="button"
                    onClick={() => onViewChange('grid')}
                    title="Grid view"
                    aria-pressed={viewMode === 'grid'}
                    className={cn(
                        'rounded p-1.5 transition-colors',
                        viewMode === 'grid' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                >
                    <HugeiconsIcon icon={GridViewIcon} className="size-4" />
                </button>
                <button
                    type="button"
                    onClick={() => onViewChange('list')}
                    title="List view"
                    aria-pressed={viewMode === 'list'}
                    className={cn(
                        'rounded p-1.5 transition-colors',
                        viewMode === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                >
                    <HugeiconsIcon icon={Menu02Icon} className="size-4" />
                </button>
            </div>
        </div>
    </div>
)
