'use client'

import Link from 'next/link'

import type { GameLeague } from '@/shared/games'
import { formatDecimal, formatInnings, type PitcherSummary } from '@/shared/analytics'

import { useGameDetail } from '../model/use-game-detail'

import { EstimateMeter } from './estimate-meter'

const PitcherLine = ({ label, pitcher }: { label: string; pitcher: PitcherSummary | null }) => (
    <div className="rounded-lg border border-foreground/10 p-3">
        <div className="text-xs text-muted-foreground">{label}</div>
        {pitcher ? (
            <>
                <div className="font-medium">{pitcher.fullName}</div>
                <div className="text-xs text-muted-foreground">
                    Throws {pitcher.throws ?? '—'} · ERA {formatDecimal(pitcher.era)} · {formatInnings(pitcher.inningsPitched)} IP
                </div>
            </>
        ) : (
            <div className="text-sm text-muted-foreground">Not announced</div>
        )}
    </div>
)

interface GameDetailPanelProps {
    gamePk: number
    league: GameLeague
    // Room for actions that belong to a game, e.g. asking the AI for picks.
    actions?: React.ReactNode
}

export const GameDetailPanel = ({ gamePk, league, actions }: GameDetailPanelProps) => {
    const { detail, isLoading, error } = useGameDetail(gamePk, league)

    if (isLoading) return <p className="text-sm text-muted-foreground">Loading the game…</p>
    if (error || !detail) {
        return <p className="text-sm text-[#dc2626]">We could not find this game.</p>
    }

    const { game } = detail
    const away = game.awayTeam.teamName ?? game.awayTeam.abbreviation
    const home = game.homeTeam.teamName ?? game.homeTeam.abbreviation

    return (
        <div className="space-y-5">
            <Link href="/games" className="text-sm text-muted-foreground hover:text-foreground">← All games</Link>
            <div>
                <h1 className="font-anton text-3xl tracking-wide">{away} @ {home}</h1>
                <p className="text-sm text-muted-foreground">
                    {new Date(game.gameDateUtc).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} · {game.venueName ?? 'Venue TBD'}
                </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <PitcherLine label={`${away} starter`} pitcher={detail.probablePitchers.away} />
                <PitcherLine label={`${home} starter`} pitcher={detail.probablePitchers.home} />
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border border-foreground/15 px-2 py-0.5">
                    {detail.lineupsPosted ? 'Lineups posted' : 'Lineups not posted yet'}
                </span>
                {detail.weather && (
                    <span className="rounded-full border border-foreground/15 px-2 py-0.5">
                        {detail.weather.condition}
                        {detail.weather.tempF !== null ? ` · ${detail.weather.tempF}°F` : ''}
                        {detail.weather.wind ? ` · ${detail.weather.wind}` : ''}
                    </span>
                )}
            </div>

            {detail.estimate ? (
                <section className="rounded-xl border border-foreground/10 p-4">
                    <EstimateMeter
                        estimate={detail.estimate}
                        awayLabel={game.awayTeam.abbreviation}
                        homeLabel={game.homeTeam.abbreviation}
                        showFactors
                    />
                    <p className="mt-3 text-xs text-muted-foreground">
                        A statistical estimate to help fantasy decisions. It is not a prediction or betting advice.
                    </p>
                </section>
            ) : (
                <p className="text-sm text-muted-foreground">An estimate is shown for games that have not started.</p>
            )}

            {game.status === 'SCHEDULED' && game.leagueSlug === 'mlb' && actions}
        </div>
    )
}
