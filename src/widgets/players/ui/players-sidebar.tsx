'use client'

import { Search01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { cn } from '@/shared/utils'

import { AVAILABILITY, AVAILABILITY_ORDER } from '../model/player.type'
import type {
    AvailabilityStatus,
    League,
    LeagueFilter,
    StatusFilter,
} from '../model/player.type'

interface PlayersSidebarProps {
    leagues: League[]
    playersByLeague: Map<string, number>
    playersByStatus: Map<string, number>
    totalPlayers: number
    search: string
    league: LeagueFilter
    status: StatusFilter
    onSearch: (q: string) => void
    onLeagueChange: (league: LeagueFilter) => void
    onStatusChange: (status: StatusFilter) => void
}

export const PlayersSidebar = ({
    leagues,
    playersByLeague,
    playersByStatus,
    totalPlayers,
    search,
    league,
    status,
    onSearch,
    onLeagueChange,
    onStatusChange,
}: PlayersSidebarProps) => (
    <aside className="hidden w-52 shrink-0 lg:block">
        <div className="sticky top-22 space-y-5">
            <div className="relative">
                <HugeiconsIcon
                    icon={Search01Icon}
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <input
                    type="text"
                    placeholder="Search players…"
                    value={search}
                    onChange={(e) => onSearch(e.target.value)}
                    className="w-full rounded-lg border border-foreground/15 bg-card py-2 pr-3 pl-9 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                />
            </div>

            <div>
                <div className="mb-1.5 px-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    League
                </div>
                <div className="space-y-0.5">
                    <FilterRow
                        active={league === 'all'}
                        onClick={() => onLeagueChange('all')}
                        label="All leagues"
                        count={totalPlayers}
                        leading={null}
                        bold
                    />
                    {leagues.map((lg) => (
                        <FilterRow
                            key={lg.slug}
                            active={league === lg.slug}
                            onClick={() => onLeagueChange(lg.slug)}
                            label={lg.name}
                            count={playersByLeague.get(lg.slug) ?? 0}
                            leading={
                                <span
                                    className="size-2 rounded-full"
                                    style={{ backgroundColor: lg.color }}
                                />
                            }
                        />
                    ))}
                </div>
            </div>

            <div>
                <div className="mb-1.5 px-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Availability
                </div>
                <div className="space-y-0.5">
                    <FilterRow
                        active={status === 'all'}
                        onClick={() => onStatusChange('all')}
                        label="Everyone"
                        count={totalPlayers}
                        leading={null}
                        bold
                    />
                    {AVAILABILITY_ORDER.map((s: AvailabilityStatus) => (
                        <FilterRow
                            key={s}
                            active={status === s}
                            onClick={() => onStatusChange(s)}
                            label={AVAILABILITY[s].label}
                            count={playersByStatus.get(s) ?? 0}
                            leading={
                                <span
                                    className="size-2 rounded-full"
                                    style={{ backgroundColor: AVAILABILITY[s].dot }}
                                />
                            }
                        />
                    ))}
                </div>
            </div>
        </div>
    </aside>
)

const FilterRow = ({
    active,
    onClick,
    label,
    count,
    leading,
    bold = false,
}: {
    active: boolean
    onClick: () => void
    label: string
    count: number
    leading: React.ReactNode
    bold?: boolean
}) => (
    <button
        type="button"
        onClick={onClick}
        className={cn(
            'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors',
            active
                ? bold
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-foreground'
                : 'text-foreground hover:bg-muted',
        )}
    >
        <span className={cn('flex items-center gap-2.5', bold && 'font-medium')}>
            {leading}
            {label}
        </span>
        <span
            className={cn(
                'text-xs',
                active && bold ? 'text-primary/70' : 'text-muted-foreground',
            )}
        >
            {count}
        </span>
    </button>
)
