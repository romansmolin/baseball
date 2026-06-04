'use client'

import { Calendar01Icon, LiveStreaming01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { useUpcomingGamesData } from '@/entities/dashboard'
import type { UpcomingGameRecord, UpcomingGameStatus } from '@/shared/games'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { cn } from '@/shared/utils'

const LIMIT = 6

export const NextGames = () => {
    const { data, error, isLoading } = useUpcomingGamesData(LIMIT)
    const games = data ?? []

    return (
        <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-base">Next games</CardTitle>
                <HugeiconsIcon
                    icon={Calendar01Icon}
                    className="size-4 text-muted-foreground"
                />
            </CardHeader>
            <CardContent className="flex flex-col">
                {error ? (
                    <div className="px-2 py-3 text-sm text-muted-foreground">
                        Couldn&apos;t load the schedule.
                    </div>
                ) : isLoading ? (
                    [0, 1, 2, 3, 4, 5].map((i) => <GameRowSkeleton key={i} />)
                ) : games.length === 0 ? (
                    <div className="px-2 py-3 text-sm text-muted-foreground">
                        No games on the schedule for the next few days.
                    </div>
                ) : (
                    games.map((game) => <GameRow key={game.gamePk} game={game} />)
                )}
            </CardContent>
        </Card>
    )
}

interface GameRowProps {
    game: UpcomingGameRecord
}

const GameRow = ({ game }: GameRowProps) => {
    const date = new Date(game.gameDateUtc)
    const awayLabel = game.awayTeam.teamName ?? game.awayTeam.abbreviation
    const homeLabel = game.homeTeam.teamName ?? game.homeTeam.abbreviation
    return (
        <div className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/40">
            <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="truncate">{awayLabel}</span>
                    <span className="rounded bg-muted px-1 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                        @
                    </span>
                    <span className="truncate">{homeLabel}</span>
                </div>
                <div className="truncate text-xs text-muted-foreground">
                    {game.venueName ??
                        `${game.awayTeam.abbreviation} at ${game.homeTeam.abbreviation}`}
                </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-xs font-medium tabular-nums text-foreground">
                    {formatRelativeDay(date)}
                </span>
                <div className="flex items-center gap-1.5">
                    <StatusBadge status={game.status} />
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                        {formatClock(date)}
                    </span>
                </div>
            </div>
        </div>
    )
}

const StatusBadge = ({ status }: { status: UpcomingGameStatus }) => {
    if (status === 'LIVE') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                <HugeiconsIcon icon={LiveStreaming01Icon} className="size-2.5" />
                Live
            </span>
        )
    }
    if (status === 'POSTPONED') {
        return (
            <span className="rounded-full border border-foreground/15 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                PPD
            </span>
        )
    }
    return null
}

const GameRowSkeleton = () => (
    <div className="flex items-center gap-3 px-2 py-2">
        <div className="flex flex-1 flex-col gap-1">
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            <div className="h-2.5 w-40 animate-pulse rounded bg-muted" />
        </div>
        <div className="flex flex-col items-end gap-1">
            <div className="h-3 w-16 animate-pulse rounded bg-muted" />
            <div className="h-2.5 w-10 animate-pulse rounded bg-muted" />
        </div>
    </div>
)

const formatRelativeDay = (date: Date): string => {
    const now = new Date()
    const startToday = startOfDay(now)
    const startTarget = startOfDay(date)
    const daysAhead = Math.round(
        (startTarget.getTime() - startToday.getTime()) / (24 * 60 * 60 * 1000),
    )
    if (daysAhead < 0) {
        // Already-started LIVE games show "Today" — anything earlier shouldn't appear in this widget.
        return 'Today'
    }
    if (daysAhead === 0) return 'Today'
    if (daysAhead === 1) return 'Tomorrow'
    return date.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    })
}

const formatClock = (date: Date): string =>
    date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

const startOfDay = (date: Date): Date => {
    const copy = new Date(date)
    copy.setHours(0, 0, 0, 0)
    return copy
}

// cn kept available in case future variants of GameRow need conditional classes.
void cn
