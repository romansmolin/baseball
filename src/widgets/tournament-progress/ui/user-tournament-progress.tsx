'use client'

import { Calendar03Icon, Medal01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { ApiError } from '@/shared/api/api-error'
import type { UserTournamentSlotScore } from '@/shared/tournaments'
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
                            slots={week.slots}
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
    slots,
}: {
    week: number
    points: number
    awarded: boolean
    slots: UserTournamentSlotScore[]
}) => {
    const expandable = slots.length > 0
    return (
        <li
            className={cn(
                'rounded-lg border border-foreground/10 text-sm',
                awarded ? 'bg-card' : 'bg-muted/30 text-muted-foreground',
            )}
        >
            <details className="group">
                <summary
                    className={cn(
                        'flex items-center gap-2 px-3 py-2 marker:hidden [&::-webkit-details-marker]:hidden',
                        expandable ? 'cursor-pointer' : 'pointer-events-none',
                    )}
                >
                    <span
                        aria-hidden
                        className={cn(
                            'text-xs text-muted-foreground transition-transform group-open:rotate-90',
                            !expandable && 'invisible',
                        )}
                    >
                        ▶
                    </span>
                    <span className="flex-1 font-medium">Week {week}</span>
                    <span
                        className={cn(
                            'font-anton text-base tabular-nums',
                            awarded ? 'text-primary' : 'text-muted-foreground/60',
                        )}
                    >
                        {awarded ? points.toLocaleString() : '—'}
                    </span>
                </summary>
                {expandable && <SlotList slots={slots} />}
            </details>
        </li>
    )
}

const SlotList = ({ slots }: { slots: UserTournamentSlotScore[] }) => (
    <ul className="divide-y divide-foreground/10 border-t border-foreground/10">
        {slots.map((slot) => (
            <li
                key={`${slot.slotPosition}-${slot.externalPlayerId}`}
                className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1 px-3 py-2"
            >
                <span className="text-xs font-semibold text-muted-foreground">
                    {slot.slotPosition}
                </span>
                <span className="truncate font-medium">{slot.playerName}</span>
                <span className="text-right tabular-nums">
                    {slot.isCaptain && (
                        <span className="mr-2 text-xs text-muted-foreground">
                            Captain · {slot.rawPoints.toLocaleString()} ×{' '}
                            {slot.rawPoints !== 0
                                ? (slot.finalPoints / slot.rawPoints).toLocaleString()
                                : '—'}
                        </span>
                    )}
                    <span className="font-semibold">{slot.finalPoints.toLocaleString()}</span>
                </span>
                <span aria-hidden />
                <span className="col-span-2 text-xs text-muted-foreground">
                    {slot.games.length === 0
                        ? 'No games this week'
                        : slot.games
                              .map(
                                  (game, index) =>
                                      `G${index + 1} ${game.points.toLocaleString()}${
                                          game.status === 'FINAL'
                                              ? ''
                                              : ` (${game.status.toLowerCase()})`
                                      }`,
                              )
                              .join('  ·  ')}
                </span>
            </li>
        ))}
    </ul>
)
