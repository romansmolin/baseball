import { CONFIDENCE_LABEL, formatPercentEstimate } from '@/shared/analytics'
import type { GameEstimate } from '@/shared/estimates'

import { estimateBarWidths } from '../model/games-grouping'

interface EstimateMeterProps {
    estimate: GameEstimate
    awayLabel: string
    homeLabel: string
    showFactors?: boolean
}

export const EstimateMeter = ({ estimate, awayLabel, homeLabel, showFactors = false }: EstimateMeterProps) => {
    const widths = estimateBarWidths(estimate.homeWinProbability)

    return (
        <div>
            <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium">
                    {awayLabel} {formatPercentEstimate(1 - estimate.homeWinProbability)}
                </span>
                <span className="text-muted-foreground">Estimate · {CONFIDENCE_LABEL[estimate.confidence]}</span>
                <span className="font-medium">
                    {formatPercentEstimate(estimate.homeWinProbability)} {homeLabel}
                </span>
            </div>
            <div
                className="flex h-2 overflow-hidden rounded-full bg-muted"
                role="img"
                aria-label={`Win estimate: ${homeLabel} ${widths.home} percent, ${awayLabel} ${widths.away} percent`}
            >
                <div className="bg-foreground/35" style={{ width: `${widths.away}%` }} />
                <div className="bg-primary" style={{ width: `${widths.home}%` }} />
            </div>
            {showFactors && (
                <ul className="mt-3 space-y-1 text-sm">
                    {estimate.factors.map((factor) => (
                        <li key={factor.key} className="flex justify-between gap-3">
                            <span className="text-muted-foreground">{factor.label}</span>
                            <span className="font-mono tabular-nums">
                                {factor.effect > 0 ? '+' : ''}
                                {(factor.effect * 100).toFixed(1)} pts
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
