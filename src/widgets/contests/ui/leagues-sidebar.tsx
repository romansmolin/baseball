'use client'

import { ArrowDown01Icon, Search01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useMemo, useState } from 'react'

import { Input } from '@/shared/ui/input'
import { cn } from '@/shared/utils'

import type { League, Region } from '../model/contest.type'
import { REGION_LABEL, REGION_ORDER } from '../model/contest.type'

interface LeaguesSidebarProps {
    leagues: League[]
    contestsByLeague: Map<string, number>
    selectedLeagueSlug: string | null
    leagueSearch: string
    onSearch: (q: string) => void
    onSelect: (slug: string | null) => void
}

export const LeaguesSidebar = ({
    leagues,
    contestsByLeague,
    selectedLeagueSlug,
    leagueSearch,
    onSearch,
    onSelect,
}: LeaguesSidebarProps) => {
    const [collapsed, setCollapsed] = useState<Partial<Record<Region, boolean>>>({})

    const groupedByRegion = useMemo(() => {
        const map = new Map<Region, League[]>()
        for (const region of REGION_ORDER) map.set(region, [])
        for (const league of leagues) map.get(league.region)?.push(league)
        return map
    }, [leagues])

    const visibleRegions = REGION_ORDER.filter((r) => (groupedByRegion.get(r)?.length ?? 0) > 0)

    return (
        <aside className="flex h-full w-64 shrink-0 flex-col gap-4 border-r border-foreground/10 p-4">
            <div className="relative">
                <HugeiconsIcon
                    icon={Search01Icon}
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                    placeholder="Search leagues..."
                    value={leagueSearch}
                    onChange={(e) => onSearch(e.target.value)}
                    className="pl-9"
                />
            </div>

            <nav className="flex flex-col gap-3 overflow-y-auto">
                <button
                    type="button"
                    onClick={() => onSelect(null)}
                    className={cn(
                        'flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors',
                        selectedLeagueSlug === null
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                >
                    <span>All leagues</span>
                    <span className="text-xs">{contestsByLeague.size > 0 ? 'global' : ''}</span>
                </button>

                {visibleRegions.map((region) => {
                    const items = groupedByRegion.get(region) ?? []
                    const isCollapsed = collapsed[region] === true

                    return (
                        <div key={region}>
                            <button
                                type="button"
                                onClick={() =>
                                    setCollapsed((prev) => ({ ...prev, [region]: !isCollapsed }))
                                }
                                className="flex w-full items-center justify-between px-2 py-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase transition-colors hover:text-foreground"
                            >
                                {REGION_LABEL[region]}
                                <HugeiconsIcon
                                    icon={ArrowDown01Icon}
                                    className={cn(
                                        'size-3 transition-transform',
                                        isCollapsed && '-rotate-90',
                                    )}
                                />
                            </button>

                            {!isCollapsed && (
                                <div className="mt-1 flex flex-col">
                                    {items.map((league) => {
                                        const isSelected = league.slug === selectedLeagueSlug
                                        const count = contestsByLeague.get(league.slug) ?? 0
                                        return (
                                            <button
                                                key={league.slug}
                                                type="button"
                                                onClick={() => onSelect(league.slug)}
                                                className={cn(
                                                    'flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                                                    isSelected
                                                        ? 'bg-primary/10 text-primary'
                                                        : 'hover:bg-muted',
                                                )}
                                            >
                                                <span className="flex items-center gap-2 truncate">
                                                    <span
                                                        className="size-2 shrink-0 rounded-full"
                                                        style={{ backgroundColor: league.dotColor }}
                                                    />
                                                    {league.name}
                                                </span>
                                                <span
                                                    className={cn(
                                                        'rounded-full bg-muted px-1.5 py-0.5 text-xs',
                                                        isSelected && 'bg-primary/15 text-primary',
                                                    )}
                                                >
                                                    {count}
                                                </span>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )
                })}

                {visibleRegions.length === 0 && (
                    <div className="px-2 py-4 text-sm text-muted-foreground">
                        No leagues match "{leagueSearch}"
                    </div>
                )}
            </nav>
        </aside>
    )
}
