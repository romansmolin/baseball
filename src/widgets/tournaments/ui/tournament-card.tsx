'use client'

import { Calendar01Icon, UserMultipleIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import type { TournamentRecord } from '@/shared/tournaments'
import { cn } from '@/shared/utils'

import {
    formatDateRange,
    formatEntryFee,
    formatPrizePool,
    formatTournamentStatus,
    formatWeekProgress,
    getDisplayStatus,
    type DisplayStatus,
} from '../model/tournament-display'
import type { LeagueOption } from '../model/tournament.type'

interface TournamentCardProps {
    tournament: TournamentRecord
    league: LeagueOption | undefined
    isSelected: boolean
    onSelect: () => void
}

export const TournamentCard = ({
    tournament,
    league,
    isSelected,
    onSelect,
}: TournamentCardProps) => {
    const displayStatus = getDisplayStatus(tournament.status)
    const isFree = tournament.entryFeeCredits === 0

    return (
        <button
            type="button"
            onClick={onSelect}
            className={cn(
                'group flex flex-col gap-3 rounded-xl border bg-card p-4 text-left transition-all hover:border-foreground/20',
                isSelected
                    ? 'border-primary/40 ring-2 ring-primary/30'
                    : 'border-foreground/10',
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="font-medium">{tournament.name}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                        {league?.name ?? tournament.leagueSlug.toUpperCase()} ·{' '}
                        {formatWeekProgress(tournament)}
                    </div>
                </div>
                <div className="text-right">
                    <div className="font-anton text-lg text-primary">
                        {formatPrizePool(tournament.prizePoolCredits)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {formatEntryFee(tournament.entryFeeCredits)}
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
                <StatusPill status={displayStatus} label={formatTournamentStatus(tournament.status)} />
                {league && (
                    <LeaguePill name={league.name} dotColor={league.dotColor} />
                )}
                {isFree && <FreePill />}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                    <HugeiconsIcon icon={Calendar01Icon} className="size-3.5" />
                    {formatDateRange(tournament.startsAt, tournament.endsAt)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <HugeiconsIcon icon={UserMultipleIcon} className="size-3.5" />
                    {tournament.memberCount.toLocaleString()} member
                    {tournament.memberCount === 1 ? '' : 's'}
                </span>
            </div>
        </button>
    )
}

const StatusPill = ({
    status,
    label,
}: {
    status: DisplayStatus
    label: string
}) => {
    if (status === 'in_season') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
                <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                {label}
            </span>
        )
    }
    if (status === 'completed') {
        return (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {label}
            </span>
        )
    }
    return (
        <span className="rounded-full border border-foreground/15 px-2 py-0.5 text-xs">
            {label}
        </span>
    )
}

const LeaguePill = ({ name, dotColor }: { name: string; dotColor: string }) => (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 px-2 py-0.5 text-xs text-muted-foreground">
        <span className="size-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
        {name}
    </span>
)

const FreePill = () => (
    <span className="rounded-full border border-primary/30 px-2 py-0.5 text-xs text-primary">
        Free
    </span>
)
