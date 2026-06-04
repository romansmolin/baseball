'use client'

import { Calendar03Icon, Medal01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { ApiError } from '@/shared/api/api-error'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/utils'

import { useUserTournamentProgressData } from '../model/use-user-tournament-progress'

interface UserTournamentProgressProps {
    tournamentId: string
}

export const UserTournamentProgress = ({
    tournamentId,
}: UserTournamentProgressProps) => {
    const { data, error, isLoading, mutate } =
        useUserTournamentProgressData(tournamentId)

    if (isLoading && !data) return <ProgressSkeleton />

    if (error) {
        if (ApiError.isApiError(error) && error.code === 'USER_NOT_IN_TOURNAMENT') {
            return null
        }
        return <ProgressError onRetry={() => void mutate()} />
    }

    if (!data) return null

    return (
        <section className="flex flex-col gap-4 rounded-2xl border border-foreground/10 bg-card p-5">
            <Header
                teamName={data.fantasyTeamName ?? 'Your team'}
                rank={data.rank}
                memberCount={data.memberCount}
                totalPoints={data.totalPoints}
                currentWeek={data.currentWeek}
                totalWeeks={data.totalWeeks}
            />

            <div className="flex flex-col gap-1.5">
                <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Weekly scoring
                </div>
                <ul className="flex flex-col gap-1">
                    {data.weeklyScores.map((week) => (
                        <WeekRow
                            key={week.week}
                            week={week.week}
                            points={week.points}
                            awarded={week.awarded}
                        />
                    ))}
                </ul>
            </div>
        </section>
    )
}

const ProgressSkeleton = () => (
    <section className="flex animate-pulse flex-col gap-4 rounded-2xl border border-foreground/10 bg-card p-5">
        <div className="flex items-center justify-between">
            <div className="space-y-2">
                <div className="h-4 w-32 rounded bg-muted" />
                <div className="h-3 w-20 rounded bg-muted/70" />
            </div>
            <div className="h-8 w-16 rounded bg-muted" />
        </div>
        <div className="space-y-1.5">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-7 rounded bg-muted/70" />
            ))}
        </div>
    </section>
)

const ProgressError = ({ onRetry }: { onRetry: () => void }) => (
    <section className="flex items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
        <p className="text-destructive">Couldn&apos;t load your progress.</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
        </Button>
    </section>
)

const Header = ({
    teamName,
    rank,
    memberCount,
    totalPoints,
    currentWeek,
    totalWeeks,
}: {
    teamName: string
    rank: number
    memberCount: number
    totalPoints: number
    currentWeek: number
    totalWeeks: number
}) => (
    <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
            <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Your standing
            </div>
            <div className="mt-1 truncate font-medium">{teamName}</div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <HugeiconsIcon icon={Medal01Icon} className="size-3.5" />
                Rank {rank} of {memberCount}
            </div>
        </div>
        <div className="flex flex-col items-end">
            <div className="font-anton text-2xl leading-none text-primary">
                {totalPoints.toLocaleString()}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">total pts</div>
            <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-foreground/10 bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
                <HugeiconsIcon icon={Calendar03Icon} className="size-3" />
                Week {currentWeek} of {totalWeeks}
            </div>
        </div>
    </div>
)

const WeekRow = ({
    week,
    points,
    awarded,
}: {
    week: number
    points: number
    awarded: boolean
}) => (
    <li
        className={cn(
            'flex items-center justify-between rounded-lg border border-foreground/10 px-3 py-2 text-sm',
            awarded ? 'bg-card' : 'bg-muted/30 text-muted-foreground',
        )}
    >
        <span className={cn('font-medium', !awarded && 'text-muted-foreground')}>
            Week {week}
        </span>
        <span
            className={cn(
                'font-anton text-base',
                awarded ? 'text-primary' : 'text-muted-foreground/60',
            )}
        >
            {awarded ? points.toLocaleString() : '—'}
        </span>
    </li>
)
