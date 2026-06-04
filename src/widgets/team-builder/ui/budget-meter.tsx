'use client'

import type { BuilderBudget } from '@/shared/team-builder'
import { cn } from '@/shared/utils'

interface BudgetMeterProps {
    budget: BuilderBudget | undefined
    salaryUsed: number
    isLoading: boolean
    error: Error | undefined
    onRetry: () => void
}

const money = (n: number) => `$${(n / 1000).toFixed(1)}k`

export const BudgetMeter = ({
    budget,
    salaryUsed,
    isLoading,
    error,
    onRetry,
}: BudgetMeterProps) => {
    if (isLoading) {
        return (
            <div className="border-b border-foreground/10 bg-muted/40">
                <div className="container mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-6 py-3">
                    <div className="h-4 w-20 animate-pulse rounded bg-foreground/10" />
                    <div className="min-w-[200px] flex-1">
                        <div className="mb-1 h-3 w-32 animate-pulse rounded bg-foreground/10" />
                        <div className="h-2 animate-pulse rounded-full bg-foreground/10" />
                    </div>
                    <div className="h-4 w-24 animate-pulse rounded bg-foreground/10" />
                </div>
            </div>
        )
    }

    if (error || !budget) {
        return (
            <div className="border-b border-foreground/10 bg-muted/40">
                <div className="container mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-3">
                    <span className="text-sm text-muted-foreground">
                        Couldn&apos;t load budget
                    </span>
                    <button
                        type="button"
                        onClick={onRetry}
                        className="rounded-md border border-foreground/15 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                    >
                        Retry
                    </button>
                </div>
            </div>
        )
    }

    const { salaryCap } = budget
    const salaryLeft = salaryCap - salaryUsed
    const isOverCap = salaryUsed > salaryCap
    const overBy = isOverCap ? salaryUsed - salaryCap : 0
    const pct = Math.min(100, salaryCap > 0 ? (salaryUsed / salaryCap) * 100 : 0)

    return (
        <div className="border-b border-foreground/10 bg-muted/40">
            <div className="container mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-6 py-3">
                <div className="min-w-[200px] flex-1">
                    <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-semibold tracking-wider text-muted-foreground uppercase">
                            Salary cap
                        </span>
                        <span className="font-mono">
                            <span>{money(salaryUsed)} used</span>{' '}
                            <span className="text-muted-foreground">
                                / {money(salaryCap)} cap
                            </span>
                        </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-foreground/10">
                        <div
                            className={cn(
                                'h-full rounded-full transition-all duration-300',
                                isOverCap ? 'bg-destructive' : 'bg-primary',
                            )}
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                        Remaining
                    </div>
                    <div
                        className={cn(
                            'font-mono text-sm font-semibold',
                            isOverCap && 'text-destructive',
                        )}
                    >
                        {money(salaryLeft)}
                    </div>
                </div>

                {isOverCap && (
                    <div className="w-full text-sm font-medium text-destructive">
                        Over cap by {money(overBy)}
                    </div>
                )}
            </div>
        </div>
    )
}
