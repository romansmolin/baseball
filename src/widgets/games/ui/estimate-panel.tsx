import { CONFIDENCE_LABEL, formatPercentEstimate, type GameDetail } from '@/shared/analytics'
import { cn } from '@/shared/utils'

import { estimateBarWidths } from '../model/games-grouping'

export const EstimatePanel = ({ detail }: { detail: GameDetail }) => {
    const { game, estimate } = detail

    if (!estimate) {
        return (
            <section className="rounded-2xl border border-foreground/10 bg-card p-6">
                <h2 className="text-lg font-bold">Win estimate</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                    The estimate is shown for games that have not started yet.
                </p>
            </section>
        )
    }

    const widths = estimateBarWidths(estimate.homeWinProbability)
    const maxEffect = Math.max(0.02, ...estimate.factors.map((f) => Math.abs(f.effect)))
    const away = game.awayTeam.abbreviation
    const home = game.homeTeam.abbreviation

    return (
        <section className="space-y-6 rounded-2xl border border-foreground/10 bg-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold">Win estimate</h2>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                    {CONFIDENCE_LABEL[estimate.confidence]}
                </span>
            </div>

            <div className="space-y-2">
                <div className="flex items-end justify-between">
                    <div>
                        <div className="text-4xl leading-none font-bold tabular-nums">
                            {formatPercentEstimate(1 - estimate.homeWinProbability)}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">{away}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-4xl leading-none font-bold tabular-nums">
                            {formatPercentEstimate(estimate.homeWinProbability)}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">{home}</div>
                    </div>
                </div>
                <div
                    className="flex h-3 overflow-hidden rounded-full bg-muted"
                    role="img"
                    aria-label={`Win estimate: ${home} ${widths.home} percent, ${away} ${widths.away} percent`}
                >
                    <div className="bg-foreground/35" style={{ width: `${widths.away}%` }} />
                    <div className="bg-primary" style={{ width: `${widths.home}%` }} />
                </div>
            </div>

            <div>
                <h3 className="text-sm font-semibold">What drives the estimate</h3>
                <p className="mb-4 text-xs text-muted-foreground">
                    Bars to the right help {home}, bars to the left help {away}. Numbers are points of win chance.
                </p>
                <ul className="space-y-3">
                    {estimate.factors.map((factor) => {
                        const share = (Math.abs(factor.effect) / maxEffect) * 50
                        const towardHome = factor.effect >= 0
                        return (
                            <li key={factor.key} className="space-y-1">
                                <div className="flex justify-between gap-3 text-sm">
                                    <span>{factor.label}</span>
                                    <span className="font-mono text-xs tabular-nums">
                                        {towardHome ? '+' : ''}
                                        {(factor.effect * 100).toFixed(1)}
                                    </span>
                                </div>
                                <div className="relative h-2 rounded-full bg-muted">
                                    <div className="absolute inset-y-0 left-1/2 w-px bg-foreground/30" />
                                    <div
                                        className={cn(
                                            'absolute inset-y-0 rounded-full',
                                            towardHome ? 'left-1/2 bg-primary' : 'right-1/2 bg-foreground/45',
                                        )}
                                        style={{ width: `${share}%` }}
                                    />
                                </div>
                            </li>
                        )
                    })}
                </ul>
            </div>

            <p className="text-xs text-muted-foreground">
                A statistical estimate to help fantasy decisions. It is not a prediction or betting advice.
            </p>
        </section>
    )
}
