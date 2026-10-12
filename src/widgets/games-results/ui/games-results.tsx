'use client'

import type { UpcomingGameRecord } from '@/shared/games'
import { cn } from '@/shared/utils'

import { type GamesDayGroup, useGamesResults } from '../model/use-games-results'

export const GamesResults = () => {
    const { resultGroups, upcomingGroups, liveCount, isLoading, resultsError, upcomingError } =
        useGamesResults()

    return (
        <div className="grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <Section
                title="Scores"
                note={liveCount > 0 ? `${liveCount} live now` : undefined}
                groups={resultGroups}
                isLoading={isLoading}
                hasError={resultsError}
                emptyText="No games played in the last three days."
            />
            <Section
                title="Coming up"
                groups={upcomingGroups}
                isLoading={isLoading}
                hasError={upcomingError}
                emptyText="No games scheduled in the next few days."
            />
        </div>
    )
}

interface SectionProps {
    title: string
    note?: string
    groups: GamesDayGroup[]
    isLoading: boolean
    hasError: boolean
    emptyText: string
}

const Section = ({ title, note, groups, isLoading, hasError, emptyText }: SectionProps) => (
    <section className="flex flex-col gap-5">
        <div className="flex items-baseline justify-between border-b-2 border-foreground pb-2">
            <h2 className="font-anton text-2xl tracking-wide">{title}</h2>
            {note && <span className="text-sm font-medium text-primary">{note}</span>}
        </div>
        {hasError ? (
            <p className="text-sm text-muted-foreground">
                Couldn&apos;t load games. Refresh to try again.
            </p>
        ) : isLoading ? (
            <div className="flex flex-col gap-3" aria-hidden>
                {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-14 animate-pulse rounded bg-muted/60" />
                ))}
            </div>
        ) : groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
            groups.map((group) => (
                <div key={group.key} className="flex flex-col">
                    <h3 className="pb-1 text-sm font-semibold text-muted-foreground">
                        {group.label}
                    </h3>
                    <ul className="divide-y divide-foreground/10 border-y border-foreground/10">
                        {group.games.map((game) => (
                            <GameRow key={game.gamePk} game={game} />
                        ))}
                    </ul>
                </div>
            ))
        )}
    </section>
)

const GameRow = ({ game }: { game: UpcomingGameRecord }) => {
    const hasScore = game.homeScore != null && game.awayScore != null
    const isFinal = game.status === 'FINAL'
    const awayLeads = hasScore && game.awayScore! > game.homeScore!
    const homeLeads = hasScore && game.homeScore! > game.awayScore!
    const isLive = game.status === 'LIVE'

    return (
        <li
            className={cn(
                'grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-3 py-3 pl-3',
                isLive && 'border-l-2 border-primary bg-primary/5 pl-[10px]',
            )}
        >
            <StatusCell game={game} />
            <div className="flex flex-col gap-1">
                <TeamLine
                    name={game.awayTeam.teamName ?? game.awayTeam.abbreviation}
                    score={game.awayScore}
                    emphasis={isFinal ? awayLeads : true}
                    dim={isFinal && homeLeads}
                />
                <TeamLine
                    name={game.homeTeam.teamName ?? game.homeTeam.abbreviation}
                    score={game.homeScore}
                    emphasis={isFinal ? homeLeads : true}
                    dim={isFinal && awayLeads}
                />
            </div>
        </li>
    )
}

const StatusCell = ({ game }: { game: UpcomingGameRecord }) => {
    if (game.status === 'LIVE') {
        return (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60 motion-reduce:animate-none" />
                    <span className="relative inline-flex size-2 rounded-full bg-primary" />
                </span>
                Live
            </span>
        )
    }
    if (game.status === 'FINAL') {
        return <span className="text-xs font-semibold text-muted-foreground">Final</span>
    }
    if (game.status === 'POSTPONED' || game.status === 'CANCELLED') {
        return (
            <span className="text-xs font-semibold text-muted-foreground">
                {game.status === 'POSTPONED' ? 'Postponed' : 'Cancelled'}
            </span>
        )
    }
    return (
        <span className="text-xs font-semibold text-muted-foreground tabular-nums">
            {new Date(game.gameDateUtc).toLocaleTimeString(undefined, {
                hour: 'numeric',
                minute: '2-digit',
            })}
        </span>
    )
}

interface TeamLineProps {
    name: string
    score: number | null
    emphasis: boolean
    dim: boolean
}

const TeamLine = ({ name, score, emphasis, dim }: TeamLineProps) => (
    <div
        className={cn(
            'flex items-baseline justify-between gap-3',
            dim && 'text-muted-foreground',
            emphasis && !dim && 'font-semibold',
        )}
    >
        <span className="truncate">{name}</span>
        {score != null && <span className="font-anton text-xl tabular-nums">{score}</span>}
    </div>
)
