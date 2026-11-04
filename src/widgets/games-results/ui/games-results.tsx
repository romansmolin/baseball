'use client'

import Link from 'next/link'

import type { UpcomingGameRecord } from '@/shared/games'
import { TeamLogo } from '@/shared/ui/team-logo'
import { cn } from '@/shared/utils'

import {
    ALL_LEAGUES,
    type GamesDayGroup,
    type LeagueOption,
    leagueLabel,
    useGamesResults,
} from '../model/use-games-results'

export const GamesResults = () => {
    const state = useGamesResults()
    const { leagueOptions, league, setLeague } = state
    // The league tag only helps when games from more than one league are on the page.
    const showLeague = leagueOptions.length > 1

    return (
        <div className="space-y-8">
            {leagueOptions.length > 1 && (
                <LeagueFilter options={leagueOptions} value={league} onChange={setLeague} />
            )}
            <div className="grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                <div className="space-y-8">
                    {state.liveGames.length > 0 && <LiveBoard games={state.liveGames} showLeague={showLeague} />}
                    <Section
                        title="Final scores"
                        showLeague={showLeague}
                        note="Last 3 days"
                        groups={state.resultGroups}
                        isLoading={state.isLoading}
                        hasError={state.resultsError}
                        empty={
                            <>
                                No finished games in the last three days.{' '}
                                <Link href="/stats" className="font-medium text-foreground underline underline-offset-4 hover:text-primary">
                                    See the latest stars
                                </Link>
                            </>
                        }
                    />
                </div>
                <Section
                    title="Coming up"
                    showLeague={showLeague}
                    note="Times in your local time"
                    groups={state.upcomingGroups}
                    isLoading={state.isLoading}
                    hasError={state.upcomingError}
                    empty="No games scheduled in the next few days. New games appear here as soon as the schedule is published."
                />
            </div>
        </div>
    )
}

const LeagueFilter = ({
    options,
    value,
    onChange,
}: {
    options: LeagueOption[]
    value: string
    onChange: (slug: string) => void
}) => {
    const all = options.reduce((sum, o) => sum + o.count, 0)
    const items = [{ slug: ALL_LEAGUES, label: 'All leagues', count: all }, ...options]
    return (
        <div role="group" aria-label="Filter by league" className="flex flex-wrap gap-2">
            {items.map((o) => (
                <button
                    key={o.slug}
                    type="button"
                    aria-pressed={value === o.slug}
                    onClick={() => onChange(o.slug)}
                    className={cn(
                        'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                        value === o.slug
                            ? 'border-board bg-board text-board-foreground'
                            : 'border-border bg-card text-foreground hover:border-board',
                    )}
                >
                    {o.label} <span className={value === o.slug ? 'text-board-foreground/60' : 'text-muted-foreground'}>{o.count}</span>
                </button>
            ))}
        </div>
    )
}

const LiveBoard = ({ games, showLeague }: { games: UpcomingGameRecord[]; showLeague: boolean }) => (
    <section aria-labelledby="live-title" className="rounded-md bg-board p-1.5 text-board-foreground">
        <div className="rounded-[4px] border border-board-line">
            <header className="flex items-center gap-2.5 border-b border-board-line px-5 py-3.5">
                <span className="relative flex size-2.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-lamp opacity-60 motion-reduce:animate-none" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-lamp" />
                </span>
                <h2 id="live-title" className="font-anton text-2xl uppercase leading-none">
                    Live now
                </h2>
                <span className="text-sm text-board-foreground/60">
                    {games.length} {games.length === 1 ? 'game' : 'games'}, scores update every minute
                </span>
            </header>
            <ul className="divide-y divide-board-line">
                {games.map((game) => (
                    <li key={game.gamePk} className="px-5 py-3">
                        <GameTeams game={game} tone="board" showLeague={showLeague} />
                    </li>
                ))}
            </ul>
        </div>
    </section>
)

interface SectionProps {
    title: string
    note: string
    showLeague: boolean
    groups: GamesDayGroup[]
    isLoading: boolean
    hasError: boolean
    empty: React.ReactNode
}

const Section = ({ title, note, showLeague, groups, isLoading, hasError, empty }: SectionProps) => (
    <section className="flex flex-col gap-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-border pb-2">
            <h2 className="font-anton text-3xl uppercase leading-none">{title}</h2>
            <span className="text-sm text-muted-foreground">{note}</span>
        </div>
        {hasError ? (
            <p role="alert" className="text-sm text-muted-foreground">
                We couldn’t load the games. Refresh the page to try again.
            </p>
        ) : isLoading ? (
            <div className="flex flex-col gap-3" aria-hidden>
                {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-14 animate-pulse rounded bg-muted/60" />
                ))}
            </div>
        ) : groups.length === 0 ? (
            <p className="max-w-prose text-sm text-muted-foreground">{empty}</p>
        ) : (
            groups.map((group) => (
                <div key={group.key} className="flex flex-col">
                    <h3 className="pb-1 text-sm font-semibold">{group.label}</h3>
                    <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                        {group.games.map((game) => (
                            <li key={game.gamePk} className="px-4 py-3">
                                <GameTeams game={game} tone="paper" showLeague={showLeague} />
                            </li>
                        ))}
                    </ul>
                </div>
            ))
        )}
    </section>
)

const GameTeams = ({ game, tone, showLeague }: { game: UpcomingGameRecord; tone: 'board' | 'paper'; showLeague: boolean }) => {
    const hasScore = game.homeScore != null && game.awayScore != null
    const isFinal = game.status === 'FINAL'
    const awayWon = isFinal && hasScore && game.awayScore! > game.homeScore!
    const homeWon = isFinal && hasScore && game.homeScore! > game.awayScore!
    const muted = tone === 'board' ? 'text-board-foreground/60' : 'text-muted-foreground'

    return (
        <div className="grid grid-cols-[4.75rem_minmax(0,1fr)] items-center gap-3">
            <div className="text-xs">
                <StatusCell game={game} tone={tone} />
                {showLeague && <p className={cn('mt-0.5 truncate', muted)}>{leagueLabel(game.leagueSlug)}</p>}
            </div>
            <div className="flex flex-col gap-1">
                <TeamLine team={game.awayTeam} score={game.awayScore} won={awayWon} lost={homeWon} tone={tone} />
                <TeamLine team={game.homeTeam} score={game.homeScore} won={homeWon} lost={awayWon} tone={tone} />
            </div>
        </div>
    )
}

const StatusCell = ({ game, tone }: { game: UpcomingGameRecord; tone: 'board' | 'paper' }) => {
    const muted = tone === 'board' ? 'text-board-foreground/60' : 'text-muted-foreground'
    if (game.status === 'LIVE') return <span className="font-semibold text-lamp">Live</span>
    if (game.status === 'FINAL') return <span className={cn('font-semibold', muted)}>Final</span>
    if (game.status === 'POSTPONED' || game.status === 'CANCELLED') {
        return <span className={cn('font-semibold', muted)}>{game.status === 'POSTPONED' ? 'Postponed' : 'Cancelled'}</span>
    }
    return (
        <span className="font-semibold tabular-nums">
            {new Date(game.gameDateUtc).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
        </span>
    )
}

interface TeamLineProps {
    team: UpcomingGameRecord['homeTeam']
    score: number | null
    won: boolean
    lost: boolean
    tone: 'board' | 'paper'
}

const TeamLine = ({ team, score, won, lost, tone }: TeamLineProps) => (

    <div
        className={cn(
            'flex items-center justify-between gap-3',
            lost && (tone === 'board' ? 'text-board-foreground/60' : 'text-muted-foreground'),
            won && 'font-semibold',
        )}
    >
        <span className="flex min-w-0 items-center gap-2.5">
            <TeamLogo teamId={team.id} label={team.abbreviation} className={lost ? 'opacity-60' : undefined} />
            <span className="truncate">{team.teamName ?? team.abbreviation}</span>
        </span>
        {score != null && (
            <span className={cn('font-anton text-2xl tabular-nums', tone === 'board' && !lost && 'text-lamp')}>{score}</span>
        )}
    </div>
)
