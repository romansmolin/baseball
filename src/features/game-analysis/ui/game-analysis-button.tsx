'use client'

import { Cancel01Icon, ChartLineData01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Dialog } from '@base-ui/react/dialog'
import Link from 'next/link'

import type { UpcomingGameRecord } from '@/shared/games'
import { Button } from '@/shared/ui/button'
import { TeamLogo } from '@/shared/ui/team-logo'
import { cn } from '@/shared/utils'

import { useGameAnalysis } from '../model/use-game-analysis'

import { AnalysisReport } from './analysis-report'

// Only games that have not started can be analysed (the server refuses anything else).
const unavailableReason = (game: UpcomingGameRecord): string | null =>
    game.status === 'SCHEDULED' ? null : 'Game analysis is only available before the game starts'

const INCLUDED = [
    ['Likely result', 'Who is favoured, win chances and how sure the model is.'],
    ['Pitchers and conditions', 'Both starters, weather and what moves the odds.'],
    ['Players to take', 'Who to start, sit or watch, with a reason for each.'],
] as const

// `className` lets a dark surface (the game banners) restyle the trigger so it stays readable.
export const GameAnalysisButton = ({ game, className }: { game: UpcomingGameRecord; className?: string }) => {
    const a = useGameAnalysis(game.gamePk, game.leagueSlug ?? 'mlb')
    const unavailable = unavailableReason(game)
    const title =
        unavailable ??
        (a.canAfford
            ? `Analyse this game for ${a.cost} credits`
            : `You need ${a.cost} credits to analyse this game${a.balance !== undefined ? ` (you have ${a.balance.toLocaleString()})` : ''}`)

    return (
        <>
            <Button
                size="sm"
                variant="outline"
                className={className}
                disabled={!a.analysis && (unavailable !== null || !a.canAfford)}
                title={a.analysis ? 'Open the analysis you paid for' : title}
                onClick={() => a.setOpen(true)}
            >
                <HugeiconsIcon icon={ChartLineData01Icon} className="size-3.5" />
                {a.analysis ? 'View analysis' : `Analyse · ${a.cost}`}
            </Button>

            <Dialog.Root open={a.open} onOpenChange={a.setOpen}>
                <Dialog.Portal>
                    <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
                    <Dialog.Popup
                        className={cn(
                            'fixed top-1/2 left-1/2 z-50 flex max-h-[88vh] w-[min(38rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col',
                            'rounded-2xl border border-foreground/10 bg-card shadow-2xl transition-all outline-none',
                            'data-[ending-style]:scale-95 data-[ending-style]:opacity-0',
                            'data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
                        )}
                    >
                        <Header game={game} />

                        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                            {a.analysis ? (
                                <AnalysisReport game={game} analysis={a.analysis} />
                            ) : a.isRunning ? (
                                <Working />
                            ) : (
                                <Offer cost={a.cost} balance={a.balance} error={a.error?.message} />
                            )}
                        </div>

                        {!a.analysis && (
                            <div className="flex items-center justify-end gap-2 border-t border-foreground/10 px-6 py-4">
                                {!a.canAfford && a.balance !== undefined && (
                                    <Link href="/wallet" className="mr-auto text-sm underline">
                                        Add credits
                                    </Link>
                                )}
                                <Button variant="ghost" onClick={() => a.setOpen(false)} disabled={a.isRunning}>
                                    Cancel
                                </Button>
                                <Button size="lg" disabled={!a.canAfford || a.isRunning} onClick={a.run}>
                                    {a.isRunning ? 'Analysing…' : `Analyse for ${a.cost} credits`}
                                </Button>
                            </div>
                        )}
                    </Dialog.Popup>
                </Dialog.Portal>
            </Dialog.Root>
        </>
    )
}

const Header = ({ game }: { game: UpcomingGameRecord }) => (
    <div className="flex items-start justify-between gap-3 border-b border-foreground/10 px-6 py-4">
        <div className="flex min-w-0 items-center gap-3">
            <div className="flex -space-x-2">
                <TeamLogo
                    teamId={game.awayTeam.id}
                    label={game.awayTeam.abbreviation}
                    className="size-11 border-2 border-card"
                />
                <TeamLogo
                    teamId={game.homeTeam.id}
                    label={game.homeTeam.abbreviation}
                    className="size-11 border-2 border-card"
                />
            </div>
            <div className="min-w-0">
                <Dialog.Title className="truncate text-base leading-tight font-semibold">
                    {game.awayTeam.teamName ?? game.awayTeam.name} @ {game.homeTeam.teamName ?? game.homeTeam.name}
                </Dialog.Title>
                <Dialog.Description className="truncate text-xs text-muted-foreground">
                    {new Date(game.gameDateUtc).toLocaleString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                    })}
                    {game.venueName && ` · ${game.venueName}`}
                </Dialog.Description>
            </div>
        </div>
        <Dialog.Close className="rounded-md p-1.5 text-muted-foreground hover:bg-muted" aria-label="Close">
            <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
        </Dialog.Close>
    </div>
)

interface OfferProps {
    cost: number
    balance: number | undefined
    error: string | undefined
}

const Offer = ({ cost, balance, error }: OfferProps) => (
    <div className="space-y-5">
        <ul className="space-y-3">
            {INCLUDED.map(([title, text]) => (
                <li key={title} className="flex gap-3">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                    <p className="text-sm">
                        <span className="font-medium">{title}.</span>{' '}
                        <span className="text-muted-foreground">{text}</span>
                    </p>
                </li>
            ))}
        </ul>

        <div className="flex items-end justify-between gap-4 rounded-xl bg-muted/60 p-4">
            <div>
                <div className="text-xs text-muted-foreground">Cost</div>
                <div className="text-2xl leading-tight font-bold tabular-nums">{cost.toLocaleString()} credits</div>
            </div>
            <div className="text-right text-xs text-muted-foreground tabular-nums">
                <div>Balance {balance?.toLocaleString() ?? '—'}</div>
                {balance !== undefined && balance >= cost && <div>After {(balance - cost).toLocaleString()}</div>}
            </div>
        </div>

        <p className="text-xs text-muted-foreground">You are only charged if the analysis comes back.</p>

        {error && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
            </p>
        )}
    </div>
)

const Working = () => (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
        <span className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
        <p className="text-sm font-medium">Reading the matchup…</p>
        <p className="text-xs text-muted-foreground">This usually takes 10 to 30 seconds. Keep this window open.</p>
    </div>
)
