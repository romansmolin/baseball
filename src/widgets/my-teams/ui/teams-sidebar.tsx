'use client'

import { Search01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useMemo } from 'react'

import { Input } from '@/shared/ui/input'
import { cn } from '@/shared/utils'

import type { League, Region } from '../model/team.type'
import { REGION_LABEL, REGION_ORDER } from '../model/team.type'

interface TeamsSidebarProps {
    leagues: League[]
    teamsByLeague: Map<string, number>
    selectedLeagueSlug: string | null
    search: string
    onSearch: (q: string) => void
    onSelect: (slug: string | null) => void
}

export const TeamsSidebar = ({
    leagues,
    teamsByLeague,
    selectedLeagueSlug,
    search,
    onSearch,
    onSelect,
}: TeamsSidebarProps) => {
    const groupedByRegion = useMemo(() => {
        const map = new Map<Region, League[]>()
        for (const region of REGION_ORDER) map.set(region, [])
        for (const league of leagues) map.get(league.region)?.push(league)
        return map
    }, [leagues])

    return (
        <aside className="hidden w-56 shrink-0 lg:block">
            <div className="sticky top-22 space-y-5">
                <div className="relative">
                    <HugeiconsIcon
                        icon={Search01Icon}
                        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                        placeholder="Search teams…"
                        value={search}
                        onChange={(e) => onSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>

                <button
                    type="button"
                    onClick={() => onSelect(null)}
                    className={cn(
                        'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors',
                        selectedLeagueSlug === null
                            ? 'bg-primary/10 text-primary'
                            : 'text-foreground hover:bg-muted',
                    )}
                >
                    <span className="font-medium">All teams</span>
                    <span
                        className={cn(
                            'text-xs',
                            selectedLeagueSlug === null ? 'text-primary/70' : 'text-muted-foreground',
                        )}
                    >
                        global
                    </span>
                </button>

                <div className="space-y-5">
                    {REGION_ORDER.map((region) => {
                        const items = groupedByRegion.get(region) ?? []
                        if (items.length === 0) return null
                        return (
                            <div key={region}>
                                <div className="mb-1.5 px-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                                    {REGION_LABEL[region]}
                                </div>
                                <div className="space-y-0.5">
                                    {items.map((league) => {
                                        const isSelected = league.slug === selectedLeagueSlug
                                        const count = teamsByLeague.get(league.slug) ?? 0
                                        return (
                                            <button
                                                key={league.slug}
                                                type="button"
                                                onClick={() => onSelect(league.slug)}
                                                className={cn(
                                                    'group flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors',
                                                    isSelected
                                                        ? 'bg-muted text-foreground'
                                                        : 'text-foreground hover:bg-muted',
                                                )}
                                            >
                                                <span className="flex items-center gap-2.5">
                                                    <span
                                                        className="size-2 rounded-full"
                                                        style={{ backgroundColor: league.dotColor }}
                                                    />
                                                    {league.name}
                                                </span>
                                                <span className="text-xs text-muted-foreground">{count}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </aside>
    )
}
