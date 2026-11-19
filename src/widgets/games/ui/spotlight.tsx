import { ArrowRight01Icon, Clock01Icon, Location01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Link from 'next/link'

import { GameAnalysisButton } from '@/features/game-analysis'
import { CONFIDENCE_LABEL } from '@/shared/analytics'
import type { UpcomingGameRecord, UpcomingGameTeam } from '@/shared/games'
import { TeamLogo } from '@/shared/ui/team-logo'

import { gameClock, gameHref, LEAGUE_LABEL } from '../model/game-links'
import { favouriteOf, topFactors } from '../model/games-board'

const LIME = 'bg-[#c6f26b] text-[#15211a]'

const Team = ({ team, role }: { team: UpcomingGameTeam; role: string }) => (
    <div className="flex items-center gap-3">
        <TeamLogo teamId={team.id} label={team.abbreviation} className="size-14 border-2 border-white/20" />
        <div className="min-w-0">
            <div className="truncate text-2xl leading-tight font-bold">{team.teamName ?? team.name}</div>
            <div className="text-xs text-board-foreground/60">{role}</div>
        </div>
    </div>
)

const Starter = ({ abbreviation, name }: { abbreviation: string; name: string | null }) => (
    <div className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
        <div className="text-[11px] font-medium tracking-wider text-board-foreground/60 uppercase">
            {abbreviation} probable
        </div>
        <div className="truncate text-sm font-semibold">{name ?? 'To be announced'}</div>
    </div>
)

export const Spotlight = ({ game }: { game: UpcomingGameRecord }) => {
    const favourite = favouriteOf(game)
    const factors = topFactors(game, 3)

    return (
        <section className="relative overflow-hidden rounded-3xl bg-board p-6 text-board-foreground shadow-xl sm:p-8">
            <div className="pointer-events-none absolute -right-24 -bottom-24 size-80 rounded-full border border-white/10" />
            <div className="relative grid gap-8 lg:grid-cols-[1.4fr_1fr]">
                <div className="space-y-6">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold tracking-wider uppercase ${LIME}`}>
                            Matchup spotlight
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1 text-xs">
                            <HugeiconsIcon icon={Clock01Icon} className="size-3.5" />
                            {gameClock(game.gameDateUtc)}
                        </span>
                        <span className="rounded-full border border-white/20 px-3 py-1 text-xs">
                            {LEAGUE_LABEL[game.leagueSlug ?? 'mlb']}
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
                        <Team team={game.awayTeam} role="Away" />
                        <span className="text-xs font-semibold tracking-widest text-board-foreground/50">AT</span>
                        <Team team={game.homeTeam} role="Home" />
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Starter abbreviation={game.awayTeam.abbreviation} name={game.awayProbablePitcher} />
                        <Starter abbreviation={game.homeTeam.abbreviation} name={game.homeProbablePitcher} />
                        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
                            <HugeiconsIcon icon={Location01Icon} className="size-4 shrink-0 text-board-foreground/60" />
                            <span className="truncate">{game.venueName ?? 'Venue to be announced'}</span>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold tracking-widest uppercase">Why the model leans</span>
                        {game.estimate && (
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${LIME}`}>
                                {CONFIDENCE_LABEL[game.estimate.confidence]}
                            </span>
                        )}
                    </div>

                    {favourite ? (
                        <>
                            <div className="mt-4 flex items-end justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="text-xs text-board-foreground/60">Favourite</div>
                                    <div className="truncate text-xl font-bold">{favourite.teamName}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs tracking-wider text-board-foreground/60 uppercase">
                                        Win chance
                                    </div>
                                    <div className="text-4xl leading-none font-bold text-[#c6f26b] tabular-nums">
                                        {Math.round(favourite.probability * 100)}%
                                    </div>
                                </div>
                            </div>
                            <ul className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm">
                                {factors.map((factor) => (
                                    <li key={factor.key} className="flex justify-between gap-3">
                                        <span className="text-board-foreground/70">{factor.label}</span>
                                        <span className="font-mono tabular-nums">
                                            {factor.effect > 0 ? '+' : ''}
                                            {(factor.effect * 100).toFixed(1)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                            <p className="mt-2 text-[11px] text-board-foreground/50">
                                Points of home win chance each factor adds or removes.
                            </p>
                        </>
                    ) : (
                        <p className="mt-4 text-sm text-board-foreground/70">
                            No estimate for this game yet. It appears once the game is scheduled.
                        </p>
                    )}

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                        <GameAnalysisButton
                            game={game}
                            className="border-transparent bg-[#c6f26b] text-[#15211a] shadow-sm hover:bg-[#d6f78f] hover:text-[#15211a]"
                        />
                        <Link
                            href={gameHref(game)}
                            className="inline-flex items-center gap-1 text-sm font-semibold hover:underline"
                        >
                            View game
                            <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    )
}
