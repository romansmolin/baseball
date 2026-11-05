'use client'

import { Search01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { cn } from '@/shared/utils'

import { REGION_LABEL, REGION_ORDER } from '../model/league.type'
import type { RegionFilter, SortKey } from '../model/league.type'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
    { value: 'tournaments', label: 'Sort: open tournaments' },
    { value: 'prize', label: 'Sort: prize pool' },
    { value: 'teams', label: 'Sort: my teams' },
    { value: 'name', label: 'Sort: name' },
]

interface LeaguesToolbarProps {
    search: string
    region: RegionFilter
    liveOnly: boolean
    sortKey: SortKey
    onSearch: (q: string) => void
    onRegionChange: (region: RegionFilter) => void
    onLiveOnlyChange: (live: boolean) => void
    onSortChange: (sort: SortKey) => void
}

export const LeaguesToolbar = ({
    search,
    region,
    liveOnly,
    sortKey,
    onSearch,
    onRegionChange,
    onLiveOnlyChange,
    onSortChange,
}: LeaguesToolbarProps) => (
    <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative">
            <HugeiconsIcon
                icon={Search01Icon}
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
                type="text"
                placeholder="Search leagues…"
                value={search}
                onChange={(e) => onSearch(e.target.value)}
                className="w-56 rounded-lg border border-foreground/15 bg-card py-2 pr-3 pl-9 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
            />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
            <RegionPill
                label="All regions"
                isActive={region === 'all'}
                onClick={() => onRegionChange('all')}
            />
            {REGION_ORDER.map((r) => (
                <RegionPill
                    key={r}
                    label={REGION_LABEL[r]}
                    isActive={region === r}
                    onClick={() => onRegionChange(r)}
                />
            ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-foreground/15 px-3 py-2 text-sm transition-colors hover:bg-muted">
                <input
                    type="checkbox"
                    checked={liveOnly}
                    onChange={(e) => onLiveOnlyChange(e.target.checked)}
                    className="size-3.5 accent-primary"
                />
                <span>In season only</span>
            </label>
            <Select items={SORT_OPTIONS} value={sortKey} onValueChange={(value) => onSortChange(value as SortKey)}>
                <SelectTrigger size="sm" aria-label="Sort by">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {SORT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    </div>
)

const RegionPill = ({
    label,
    isActive,
    onClick,
}: {
    label: string
    isActive: boolean
    onClick: () => void
}) => (
    <button
        type="button"
        onClick={onClick}
        className={cn(
            'rounded-full px-3.5 py-1.5 text-sm transition-colors',
            isActive
                ? 'bg-primary text-primary-foreground'
                : 'border border-foreground/15 text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
    >
        {label}
    </button>
)
