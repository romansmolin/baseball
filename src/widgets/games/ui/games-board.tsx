'use client'

import { Globe02Icon, Search01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { cn } from '@/shared/utils'

import { LEAGUE_LABEL } from '../model/game-links'
import { useGamesBoard, type LeagueFilter } from '../model/use-games-board'

import { DatePicker } from './date-picker'
import { MatchupCard } from './matchup-card'
import { SlateStatsRow } from './slate-stats'
import { Spotlight } from './spotlight'

const dayLabel = (dateKey: string) =>
    new Date(`${dateKey}T12:00:00`).toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    })

export const GamesBoard = () => {
    const board = useGamesBoard()
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, ' ')

    return (
        <div className="container mx-auto max-w-6xl space-y-8 px-6 py-8">
            <header className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                    <p className="text-xs font-semibold tracking-[0.2em] text-[#2e7d4f] uppercase">The matchup board</p>
                    <h1 className="text-5xl font-bold tracking-tight">
                        Upcoming games<span className="text-primary">.</span>
                    </h1>
                    <p className="text-muted-foreground">Find the fantasy edge before first pitch.</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-xl border border-foreground/10 bg-card px-4 py-2 text-xs text-muted-foreground">
                    <HugeiconsIcon icon={Globe02Icon} className="size-4" />
                    Win chances are estimates · Times in {timeZone}
                </span>
            </header>

            {board.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading the schedule…</p>
            ) : board.error ? (
                <p className="text-sm text-destructive">We could not load the schedule right now.</p>
            ) : board.days.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-foreground/15 px-4 py-12 text-center text-sm text-muted-foreground">
                    No games in the next few days. Check back when the next games are scheduled.
                </p>
            ) : (
                <>
                    <SlateStatsRow stats={board.stats} dayLabel={board.activeKey ? dayLabel(board.activeKey) : ''} />
                    <DatePicker days={board.days} activeKey={board.activeKey} onSelect={board.selectDay} />
                    {board.spotlight && <Spotlight game={board.spotlight} />}

                    <section className="space-y-4">
                        <div className="flex flex-wrap items-end justify-between gap-4">
                            <div>
                                <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                                    All matchups
                                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold tabular-nums">
                                        {board.matchups.length}
                                    </span>
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Starters, win chance and the biggest factor for every game.
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <label className="flex items-center gap-2 rounded-xl border border-foreground/10 bg-card px-3 py-2">
                                    <HugeiconsIcon icon={Search01Icon} className="size-4 text-muted-foreground" />
                                    <input
                                        value={board.query}
                                        onChange={(e) => board.setQuery(e.target.value)}
                                        placeholder="Search teams or pitchers"
                                        className="w-52 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                                    />
                                </label>
                                <LeagueFilterBar
                                    value={board.league}
                                    leagues={board.leagues}
                                    onChange={board.setLeague}
                                />
                            </div>
                        </div>

                        {board.matchups.length === 0 ? (
                            <p className="rounded-2xl border border-dashed border-foreground/15 px-4 py-10 text-center text-sm text-muted-foreground">
                                No games match your search.
                            </p>
                        ) : (
                            <div className="grid gap-5 lg:grid-cols-2">
                                {board.matchups.map((game) => (
                                    <MatchupCard key={game.gamePk} game={game} />
                                ))}
                            </div>
                        )}
                    </section>

                    <p className="text-xs text-muted-foreground">
                        Win estimates are statistical estimates to help fantasy decisions. They are not predictions or
                        betting advice.
                    </p>
                </>
            )}
        </div>
    )
}

const LeagueFilterBar = ({
    value,
    leagues,
    onChange,
}: {
    value: LeagueFilter
    leagues: Set<string>
    onChange: (league: LeagueFilter) => void
}) => {
    const options: Array<{ value: LeagueFilter; label: string }> = [
        { value: 'all', label: 'All' },
        ...(['mlb', 'winter-leagues'] as const)
            .filter((league) => leagues.has(league))
            .map((league) => ({ value: league, label: LEAGUE_LABEL[league] })),
    ]
    if (options.length < 3) return null

    return (
        <div className="inline-flex rounded-xl border border-foreground/10 bg-card p-1">
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    onClick={() => onChange(option.value)}
                    aria-pressed={value === option.value}
                    className={cn(
                        'rounded-lg px-4 py-1.5 text-sm font-medium transition-colors',
                        value === option.value
                            ? 'bg-accent text-accent-foreground'
                            : 'text-muted-foreground hover:text-foreground',
                    )}
                >
                    {option.label}
                </button>
            ))}
        </div>
    )
}
