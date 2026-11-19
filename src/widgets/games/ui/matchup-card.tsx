import { ArrowRight01Icon, Clock01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Link from 'next/link'

import { GameAnalysisButton } from '@/features/game-analysis'
import type { UpcomingGameRecord, UpcomingGameTeam } from '@/shared/games'
import { TeamLogo } from '@/shared/ui/team-logo'

import { gameClock, gameHref, LEAGUE_LABEL } from '../model/game-links'
import { favouriteOf, topFactors } from '../model/games-board'

import { EstimateMeter } from './estimate-meter'

const TeamRow = ({ team, role, league }: { team: UpcomingGameTeam; role: string; league: string }) => (
    <div className="flex items-center gap-3">
        <TeamLogo teamId={team.id} label={team.abbreviation} className="size-11 border border-foreground/10" />
        <div className="min-w-0">
            <div className="truncate text-base leading-tight font-semibold">{team.teamName ?? team.name}</div>
            <div className="text-xs text-muted-foreground">
                {role} · {league}
            </div>
        </div>
    </div>
)

const Starter = ({ abbreviation, name }: { abbreviation: string; name: string | null }) => (
    <div className="min-w-0">
        <div className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
            {abbreviation} starter
        </div>
        <div className="truncate text-sm font-medium">{name ?? 'To be announced'}</div>
    </div>
)

export const MatchupCard = ({ game }: { game: UpcomingGameRecord }) => {
    const favourite = favouriteOf(game)
    const [factor] = topFactors(game, 1)
    const league = LEAGUE_LABEL[game.leagueSlug ?? 'mlb']

    return (
        <article className="flex flex-col gap-5 rounded-2xl border border-foreground/10 bg-card p-5 transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-sm font-semibold">
                    <span className="flex size-8 items-center justify-center rounded-full bg-muted">
                        <HugeiconsIcon icon={Clock01Icon} className="size-4" />
                    </span>
                    {gameClock(game.gameDateUtc)}
                </span>
                <span className="truncate text-xs text-muted-foreground">{game.venueName ?? 'Venue TBA'}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
                <div className="space-y-3">
                    <TeamRow team={game.awayTeam} role="Away" league={league} />
                    <TeamRow team={game.homeTeam} role="Home" league={league} />
                </div>
                <div className="shrink-0 border-l border-foreground/10 pl-5 text-center">
                    <div className="text-xs text-muted-foreground">{favourite ? 'Favourite' : 'Win chance'}</div>
                    <div className="text-3xl leading-tight font-bold tabular-nums">
                        {favourite ? `${Math.round(favourite.probability * 100)}%` : '—'}
                    </div>
                    <div className="text-xs text-muted-foreground">{favourite?.abbreviation ?? 'no estimate'}</div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-foreground/10 pt-4">
                <Starter abbreviation={game.awayTeam.abbreviation} name={game.awayProbablePitcher} />
                <Starter abbreviation={game.homeTeam.abbreviation} name={game.homeProbablePitcher} />
            </div>

            {game.estimate && (
                <div className="space-y-2 rounded-xl bg-muted/60 p-4">
                    <EstimateMeter
                        estimate={game.estimate}
                        awayLabel={game.awayTeam.abbreviation}
                        homeLabel={game.homeTeam.abbreviation}
                    />
                    {factor && (
                        <p className="text-xs text-muted-foreground">
                            Biggest factor: <span className="font-medium text-foreground">{factor.label}</span> (
                            {factor.effect > 0 ? '+' : ''}
                            {(factor.effect * 100).toFixed(1)} pts for the home team)
                        </p>
                    )}
                </div>
            )}

            <div className="mt-auto flex items-center justify-between gap-3">
                <GameAnalysisButton game={game} />
                <Link
                    href={gameHref(game)}
                    className="inline-flex items-center gap-1 text-sm font-semibold hover:underline"
                >
                    View game
                    <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
                </Link>
            </div>
        </article>
    )
}
