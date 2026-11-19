'use client'

import { Calendar01Icon, Location01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Link from 'next/link'

import { GameAnalysisButton } from '@/features/game-analysis'
import type { UpcomingGameRecord, UpcomingGameStatus, UpcomingGameTeam } from '@/shared/games'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { TeamLogo } from '@/shared/ui/team-logo'

import { type NextGamesTab, useNextGames } from '../model/use-next-games'

export const NextGames = () => {
    const { tab, selectTab, games, hasMore, showMore, error, isLoading } = useNextGames()

    return (
        <Card className="h-full">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                    Next games
                    <HugeiconsIcon icon={Calendar01Icon} className="size-4 text-muted-foreground" />
                </CardTitle>
                <Tabs value={tab} onValueChange={(v) => selectTab(v as NextGamesTab)}>
                    <TabsList>
                        <TabsTrigger value="soon">Soon</TabsTrigger>
                        <TabsTrigger value="this-week">This week</TabsTrigger>
                        <TabsTrigger value="next-week">Next week</TabsTrigger>
                    </TabsList>
                </Tabs>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                {error ? (
                    <div className="px-2 py-3 text-sm text-muted-foreground">
                        Couldn&apos;t load the schedule.
                    </div>
                ) : isLoading ? (
                    <div className={GRID}>
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                            <GameCardSkeleton key={i} />
                        ))}
                    </div>
                ) : games.length === 0 ? (
                    <div className="px-2 py-3 text-sm text-muted-foreground">
                        No games on the schedule for this period.
                    </div>
                ) : (
                    <div className={GRID}>
                        {games.map((game) => (
                            <GameTile key={game.gamePk} game={game} />
                        ))}
                    </div>
                )}
                {hasMore && (
                    <Button variant="outline" className="self-center" onClick={showMore}>
                        Show more
                    </Button>
                )}
            </CardContent>
        </Card>
    )
}

const GRID = 'grid gap-3 sm:grid-cols-2 xl:grid-cols-3'

const gameHref = (game: UpcomingGameRecord) =>
    game.leagueSlug && game.leagueSlug !== 'mlb'
        ? `/games/${game.gamePk}?league=${game.leagueSlug}`
        : `/games/${game.gamePk}`

const GameTile = ({ game }: { game: UpcomingGameRecord }) => {
    const date = new Date(game.gameDateUtc)
    const started = game.status === 'LIVE'

    return (
        <div className="flex flex-col rounded-xl border border-foreground/10 bg-card transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-sm">
            <Link
                href={gameHref(game)}
                className="flex flex-col gap-4 rounded-t-xl p-4 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
            >
                <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{formatRelativeDay(date)}</span>
                    <div className="flex items-center gap-2">
                        <StatusBadge status={game.status} />
                        <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium tabular-nums">
                            {formatClock(date)}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col gap-2.5">
                    <TeamLine
                        team={game.awayTeam}
                        pitcher={game.awayProbablePitcher}
                        score={started ? game.awayScore : null}
                    />
                    <TeamLine
                        team={game.homeTeam}
                        pitcher={game.homeProbablePitcher}
                        score={started ? game.homeScore : null}
                    />
                </div>
            </Link>

            <div className="mt-auto flex items-center justify-between gap-2 border-t border-foreground/10 px-4 py-2.5 text-xs text-muted-foreground">
                <span className="flex min-w-0 items-center gap-1.5">
                    <HugeiconsIcon icon={Location01Icon} className="size-3.5 shrink-0" />
                    <span className="truncate">{game.venueName ?? 'Venue TBD'}</span>
                </span>
                <GameAnalysisButton game={game} />
            </div>
        </div>
    )
}

interface TeamLineProps {
    team: UpcomingGameTeam
    pitcher: string | null
    score: number | null
}

const TeamLine = ({ team, pitcher, score }: TeamLineProps) => (
    <div className="flex items-center gap-3">
        <TeamLogo
            teamId={team.id}
            label={team.abbreviation}
            className="size-10 border border-foreground/10"
        />
        <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm leading-tight font-semibold">
                {team.teamName ?? team.abbreviation}
            </span>
            <span className="truncate text-xs text-muted-foreground">
                {pitcher ?? 'Starter TBD'}
            </span>
        </div>
        {score !== null && <span className="text-lg font-semibold tabular-nums">{score}</span>}
    </div>
)

const StatusBadge = ({ status }: { status: UpcomingGameStatus }) => {
    if (status === 'LIVE') {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                Live
            </span>
        )
    }
    if (status === 'POSTPONED') {
        return (
            <span className="rounded-full border border-foreground/15 px-2 py-0.5 text-xs text-muted-foreground">
                Postponed
            </span>
        )
    }
    return null
}

const GameCardSkeleton = () => (
    <div className="flex flex-col gap-4 rounded-xl border border-foreground/10 p-4">
        <div className="flex justify-between">
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="h-5 w-16 animate-pulse rounded bg-muted" />
        </div>
        {[0, 1].map((i) => (
            <div key={i} className="flex items-center gap-3">
                <div className="size-10 animate-pulse rounded-full bg-muted" />
                <div className="flex flex-col gap-1.5">
                    <div className="h-3.5 w-28 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                </div>
            </div>
        ))}
        <div className="h-3 w-36 animate-pulse rounded bg-muted" />
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
