'use client'

import { Clock01Icon, StarIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { cn } from '@/shared/utils'

import type { League, Team, ViewMode } from '../model/team.type'

interface TeamCardProps {
    team: Team
    league: League | undefined
    isFav: boolean
    view: ViewMode
    onSelect: () => void
    onToggleFav: () => void
}

const initials = (name: string) =>
    name
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()

const savedLabel = (d: number) => (d === 0 ? 'today' : d === 1 ? 'yesterday' : `${d}d ago`)

const hexA = (hex: string, a: number) => {
    const n = parseInt(hex.slice(1), 16)
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

export const TeamCard = ({ team, league, isFav, view, onSelect, onToggleFav }: TeamCardProps) => {
    const dotColor = league?.dotColor ?? '#999999'
    const leagueName = league?.name ?? team.leagueSlug.toUpperCase()

    const crest = (
        <span
            className={cn(
                'flex shrink-0 items-center justify-center rounded-xl font-anton',
                view === 'list' ? 'size-11 text-base' : 'size-12 text-lg',
            )}
            style={{ backgroundColor: hexA(dotColor, 0.13), color: dotColor }}
        >
            {initials(team.name)}
        </span>
    )

    const star = (
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation()
                onToggleFav()
            }}
            title="Star team"
            aria-pressed={isFav}
            className={cn(
                'rounded-md p-1.5 transition-colors hover:bg-muted',
                isFav ? 'text-primary' : 'text-muted-foreground/60 hover:text-foreground',
            )}
        >
            <HugeiconsIcon
                icon={StarIcon}
                className="size-4"
                fill={isFav ? 'currentColor' : 'none'}
            />
        </button>
    )

    const pills = (
        <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-foreground/15 px-2 py-0.5 text-xs text-muted-foreground">
                {team.format}
            </span>
            {team.captain && (
                <span className="rounded-full border border-primary/30 px-2 py-0.5 text-xs text-primary">
                    Captain ×1.5
                </span>
            )}
            {team.status === 'active' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/12 px-2 py-0.5 text-xs text-primary">
                    <span className="size-1.5 rounded-full bg-primary" />
                    In {team.entered} tournament{team.entered === 1 ? '' : 's'}
                </span>
            ) : (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    Draft
                </span>
            )}
        </div>
    )

    const handleKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onSelect()
        }
    }

    if (view === 'list') {
        return (
            <div
                role="button"
                tabIndex={0}
                onClick={onSelect}
                onKeyDown={handleKey}
                className="group flex cursor-pointer items-center gap-4 rounded-xl border border-foreground/10 bg-card p-3.5 text-left transition-all hover:border-foreground/20"
            >
                {crest}
                <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{team.name}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                        {leagueName} · {team.format} · {team.players} players
                    </div>
                </div>
                <div className="hidden items-center gap-1.5 md:flex">{pills}</div>
                <div className="ml-2 text-right">
                    <div className="font-anton text-xl leading-none text-primary">
                        {team.proj.toFixed(1)}
                    </div>
                    <div className="text-[11px] text-muted-foreground">proj. pts</div>
                </div>
                {star}
            </div>
        )
    }

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onSelect}
            onKeyDown={handleKey}
            className="group flex cursor-pointer flex-col gap-3 rounded-xl border border-foreground/10 bg-card p-4 text-left transition-all hover:border-foreground/20 hover:shadow-sm"
        >
            <div className="flex items-start gap-3">
                {crest}
                <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{team.name}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                        {leagueName} · {team.format}
                    </div>
                </div>
                {star}
            </div>
            {pills}
            <div className="mt-1 grid grid-cols-3 gap-2 border-t border-foreground/10 pt-3">
                <Stat label="Proj. pts" value={team.proj.toFixed(1)} accent />
                <Stat label="Best score" value={team.best.toFixed(1)} />
                <Stat label="Players" value={String(team.players)} />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <HugeiconsIcon icon={Clock01Icon} className="size-3.5" />
                Saved {savedLabel(team.savedDaysAgo)}
            </div>
        </div>
    )
}

const Stat = ({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) => (
    <div>
        <div className={cn('font-anton text-xl leading-none', accent && 'text-primary')}>
            {value}
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">{label}</div>
    </div>
)
