'use client'

import { ArrowRight01Icon, Location01Icon, UserMultipleIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import type { League } from '../model/league.type'

interface LeagueCardProps {
    league: League
    onSelect: () => void
}

const hexA = (hex: string, a: number) => {
    const n = parseInt(hex.slice(1), 16)
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

export const LeagueCard = ({ league, onSelect }: LeagueCardProps) => {
    const handleKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onSelect()
        }
    }

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onSelect}
            onKeyDown={handleKey}
            className="group flex cursor-pointer flex-col gap-4 rounded-xl border border-foreground/10 bg-card p-5 text-left transition-all hover:border-foreground/20 hover:shadow-sm"
        >
            <div className="flex items-start gap-3">
                <span
                    className="flex size-14 shrink-0 items-center justify-center rounded-2xl font-anton text-lg"
                    style={{ backgroundColor: hexA(league.color, 0.13), color: league.color }}
                >
                    {league.name}
                </span>
                <div className="min-w-0 flex-1">
                    <div className="truncate leading-tight font-medium">{league.full}</div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <HugeiconsIcon icon={Location01Icon} className="size-3.5" />
                        {league.country}
                    </div>
                    <div className="mt-2">
                        <SeasonBadge season={league.season} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2 border-t border-foreground/10 pt-4">
                <Stat label="Open tournaments" value={String(league.openTournaments)} accent />
                <Stat label="Prize pool" value={league.prizePool} />
                <Stat label="Pro teams" value={String(league.proTeams)} />
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <HugeiconsIcon icon={UserMultipleIcon} className="size-3.5" />
                    {league.myTeams} of your teams
                </div>
                <span className="flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    Details <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" />
                </span>
            </div>
        </div>
    )
}

const Stat = ({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) => (
    <div>
        <div
            className={
                accent
                    ? 'font-anton text-xl leading-none text-primary'
                    : 'font-anton text-xl leading-none'
            }
        >
            {value}
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">{label}</div>
    </div>
)

export const SeasonBadge = ({ season }: { season: League['season'] }) =>
    season === 'live' ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/12 px-2 py-0.5 text-xs text-primary">
            <span className="size-1.5 rounded-full bg-primary" /> In season
        </span>
    ) : (
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            Off-season
        </span>
    )
