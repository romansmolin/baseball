'use client'

import type { ApiError } from '@/shared/api/api-error'
import type { TournamentRecord } from '@/shared/tournaments'

import type { LeagueOption } from '../model/tournament.type'

import { TournamentCard } from './tournament-card'

interface TournamentsListProps {
    tournaments: TournamentRecord[]
    leaguesBySlug: Map<string, LeagueOption>
    selectedTournamentId: string | null
    onSelect: (id: string) => void
    isLoading: boolean
    error: ApiError | undefined
}

export const TournamentsList = ({
    tournaments,
    leaguesBySlug,
    selectedTournamentId,
    onSelect,
    isLoading,
    error,
}: TournamentsListProps) => {
    if (isLoading && tournaments.length === 0) {
        return (
            <div className="flex flex-col gap-3 overflow-y-auto p-4">
                {[0, 1, 2, 3, 4].map((i) => (
                    <TournamentCardSkeleton key={i} />
                ))}
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
                <div className="text-sm font-medium">Couldn&apos;t load tournaments.</div>
                <div className="text-xs text-muted-foreground">
                    {error.message || 'Please try again in a moment.'}
                </div>
            </div>
        )
    }

    if (tournaments.length === 0) {
        return (
            <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
                No tournaments match these filters.
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-3 overflow-y-auto p-4">
            {tournaments.map((tournament) => (
                <TournamentCard
                    key={tournament.id}
                    tournament={tournament}
                    league={leaguesBySlug.get(tournament.leagueSlug)}
                    isSelected={tournament.id === selectedTournamentId}
                    onSelect={() => onSelect(tournament.id)}
                />
            ))}
        </div>
    )
}

const TournamentCardSkeleton = () => (
    <div className="flex flex-col gap-3 rounded-xl border border-foreground/10 bg-card p-4">
        <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            </div>
            <div className="flex flex-col items-end gap-2">
                <div className="h-5 w-20 animate-pulse rounded bg-muted" />
                <div className="h-3 w-16 animate-pulse rounded bg-muted" />
            </div>
        </div>
        <div className="flex gap-1.5">
            <div className="h-5 w-14 animate-pulse rounded-full bg-muted" />
            <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
        </div>
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
    </div>
)
