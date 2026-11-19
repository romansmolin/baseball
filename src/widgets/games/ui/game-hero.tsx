import { Clock01Icon, Location01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { formatDecimal, formatInnings, type GameDetail, type PitcherSummary } from '@/shared/analytics'
import type { UpcomingGameTeam } from '@/shared/games'
import { TeamLogo } from '@/shared/ui/team-logo'

import { LEAGUE_LABEL } from '../model/game-links'
import { formatKickoff, STATUS_LABEL } from '../model/game-status'

const LIME = 'bg-[#c6f26b] text-[#15211a]'

const Team = ({ team, role, score }: { team: UpcomingGameTeam; role: string; score: number | null }) => (
    <div className="flex flex-1 flex-col items-center gap-3 text-center">
        <TeamLogo teamId={team.id} label={team.abbreviation} className="size-24 border-4 border-white/20" />
        <div>
            <div className="text-2xl leading-tight font-bold sm:text-3xl">{team.teamName ?? team.name}</div>
            <div className="text-xs text-board-foreground/60">{role}</div>
        </div>
        {score !== null && <div className="text-5xl leading-none font-bold tabular-nums">{score}</div>}
    </div>
)

const Starter = ({ abbreviation, pitcher }: { abbreviation: string; pitcher: PitcherSummary | null }) => (
    <div className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
        <div className="text-[11px] font-medium tracking-wider text-board-foreground/60 uppercase">
            {abbreviation} probable
        </div>
        {pitcher ? (
            <>
                <div className="truncate text-sm font-semibold">{pitcher.fullName}</div>
                <div className="text-xs text-board-foreground/60">
                    {pitcher.throws ? `${pitcher.throws}HP` : '—'} · {formatDecimal(pitcher.era)} ERA ·{' '}
                    {formatInnings(pitcher.inningsPitched)} IP
                </div>
            </>
        ) : (
            <div className="text-sm font-semibold">To be announced</div>
        )}
    </div>
)

export const GameHero = ({ detail, actions }: { detail: GameDetail; actions: React.ReactNode }) => {
    const { game } = detail
    const started = game.status === 'LIVE' || game.status === 'FINAL'

    return (
        <section className="relative overflow-hidden rounded-3xl bg-board p-6 text-board-foreground shadow-xl sm:p-8">
            <div className="pointer-events-none absolute -right-24 -bottom-24 size-80 rounded-full border border-white/10" />
            <div className="relative space-y-7">
                <div className="flex flex-wrap items-center gap-2">
                    <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${LIME}`}
                    >
                        {game.status === 'LIVE' && (
                            <span className="size-1.5 animate-pulse rounded-full bg-[#15211a]" />
                        )}
                        {STATUS_LABEL[game.status]}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1 text-xs">
                        <HugeiconsIcon icon={Clock01Icon} className="size-3.5" />
                        {formatKickoff(game.gameDateUtc)}
                    </span>
                    <span className="rounded-full border border-white/20 px-3 py-1 text-xs">
                        {LEAGUE_LABEL[game.leagueSlug ?? 'mlb']}
                    </span>
                    <span className="ml-auto">{actions}</span>
                </div>

                <div className="flex items-center gap-4">
                    <Team team={game.awayTeam} role="Away" score={started ? game.awayScore : null} />
                    <span className="text-xs font-semibold tracking-widest text-board-foreground/50">AT</span>
                    <Team team={game.homeTeam} role="Home" score={started ? game.homeScore : null} />
                </div>

                <div className="flex flex-wrap gap-3">
                    <Starter abbreviation={game.awayTeam.abbreviation} pitcher={detail.probablePitchers.away} />
                    <Starter abbreviation={game.homeTeam.abbreviation} pitcher={detail.probablePitchers.home} />
                    <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
                        <HugeiconsIcon icon={Location01Icon} className="size-4 shrink-0 text-board-foreground/60" />
                        <span className="truncate">{game.venueName ?? 'Venue to be announced'}</span>
                    </div>
                </div>
            </div>
        </section>
    )
}
