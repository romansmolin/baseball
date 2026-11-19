import { FORECAST_PERIOD_LABEL, type ForecastPeriod } from '@/shared/team-builder'

import type { ProjectionBasis } from '@/entities/projections'

interface ProjectionMeterProps {
    filledCount: number
    rosterSize: number
    projTotal: number
    period: ForecastPeriod
    basis: ProjectionBasis | null
    isLoading: boolean
    error: Error | undefined
    onRetry: () => void
}

export const ProjectionMeter = ({
    filledCount,
    rosterSize,
    projTotal,
    period,
    basis,
    isLoading,
    error,
    onRetry,
}: ProjectionMeterProps) => (
    <div className="border-b border-foreground/10 bg-muted/40">
        <div className="container mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-2 px-6 py-3">
            <div className="flex items-center gap-3">
                <div className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Roster</div>
                <div className="font-anton text-xl leading-none">
                    <span>{filledCount}</span>
                    <span className="text-muted-foreground">/{rosterSize}</span>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Expected points · {FORECAST_PERIOD_LABEL[period].toLowerCase()}
                </div>
                <div className="font-anton text-xl leading-none text-primary">{projTotal.toFixed(1)}</div>
            </div>
            <div className="text-xs text-muted-foreground">
                {error ? (
                    <>
                        Couldn’t load forecasts.{' '}
                        <button type="button" onClick={onRetry} className="underline">
                            Retry
                        </button>
                    </>
                ) : isLoading ? (
                    'Loading forecasts…'
                ) : basis === 'season-pace' ? (
                    'Off-season estimate: no scheduled games, so points use season pace'
                ) : null}
            </div>
        </div>
    </div>
)
