import Link from 'next/link'

import type { UpcomingGameRecord } from '@/shared/games'

import { EstimateMeter } from './estimate-meter'

const clock = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

export const GameCard = ({ game }: { game: UpcomingGameRecord }) => {
    const away = game.awayTeam.teamName ?? game.awayTeam.abbreviation
    const home = game.homeTeam.teamName ?? game.homeTeam.abbreviation

    return (
        <Link
            href={game.leagueSlug && game.leagueSlug !== 'mlb' ? `/games/${game.gamePk}?league=${game.leagueSlug}` : `/games/${game.gamePk}`}
            className="block rounded-xl border border-foreground/10 bg-card p-4 transition-colors hover:border-foreground/25"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="truncate font-medium">
                        {away} <span className="text-muted-foreground">@</span> {home}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{game.venueName ?? '—'}</div>
                </div>
                <div className="shrink-0 text-right text-xs">
                    <div className="font-medium tabular-nums">{clock(game.gameDateUtc)}</div>
                    <div className="text-muted-foreground">
                        {game.status === 'LIVE' ? 'Live' : game.status === 'SCHEDULED' ? 'Scheduled' : game.status.toLowerCase()}
                    </div>
                </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <span className="truncate">{game.awayProbablePitcher ?? 'Starter TBD'}</span>
                <span className="truncate text-right">{game.homeProbablePitcher ?? 'Starter TBD'}</span>
            </div>
            {game.estimate && (
                <div className="mt-3">
                    <EstimateMeter estimate={game.estimate} awayLabel={game.awayTeam.abbreviation} homeLabel={game.homeTeam.abbreviation} />
                </div>
            )}
        </Link>
    )
}
