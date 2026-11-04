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

export const TeamCard = ({ team, league, isFav, view, onSelect, onToggleFav }: TeamCardProps) => {
    const dotColor = league?.dotColor ?? '#999999'
    const leagueName = league?.name ?? team.leagueSlug.toUpperCase()

    const crest = (
        <span
            className={cn(
                'flex shrink-0 items-center justify-center rounded-md bg-board font-anton',
                view === 'list' ? 'size-11 text-base' : 'size-12 text-lg',
            )}
            style={{ color: dotColor }}
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
                <span className="rounded-full border border-board/30 px-2 py-0.5 text-xs font-medium text-board">
                    Captain ×1.5
                </span>
            )}
            {team.status === 'active' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-board/10 px-2 py-0.5 text-xs font-medium text-board">
                    <span className="size-1.5 rounded-full bg-board" />
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
                className="group flex cursor-pointer items-center gap-4 rounded-lg border border-border bg-card p-3.5 text-left transition-colors hover:border-board focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
                {crest}
                <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{team.name}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                        {leagueName} · {team.format} · {team.players} players
                    </div>
                </div>
                <div className="hidden items-center gap-1.5 md:flex">{pills}</div>
                <ProjChip value={team.proj} />
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
            className="group flex cursor-pointer flex-col gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-board focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
            <div className="flex items-start gap-3">
                {crest}
                <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{team.name}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                        {leagueName} · {team.format}
                    </div>
                </div>
                <ProjChip value={team.proj} />
                {star}
            </div>
            {pills}
            <div className="mt-1 grid grid-cols-2 gap-2 border-t border-border pt-3">
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

const ProjChip = ({ value }: { value: number }) => (
    <div className="shrink-0 rounded-md bg-board px-2.5 py-1.5 text-center text-board-foreground">
        <div className="font-anton text-xl leading-none text-lamp tabular-nums">{value.toFixed(1)}</div>
        <div className="mt-0.5 text-[11px] text-board-foreground/60">proj. pts</div>
    </div>
)

const Stat = ({ label, value }: { label: string; value: string }) => (
    <div>
        <div className="font-anton text-xl leading-none">{value}</div>
        <div className="mt-1 text-[11px] text-muted-foreground">{label}</div>
    </div>
)
