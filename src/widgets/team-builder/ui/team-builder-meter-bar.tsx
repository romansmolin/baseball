import { cn } from '@/shared/utils'

interface TeamBuilderMeterBarProps {
    filledCount: number
    rosterSize: number
    salaryUsed: number
    salaryCap: number
    salaryLeft: number
    projTotal: number
    isOverCap: boolean
}

const money = (n: number) => `$${(n / 1000).toFixed(1)}k`

export const TeamBuilderMeterBar = ({
    filledCount,
    rosterSize,
    salaryUsed,
    salaryCap,
    salaryLeft,
    projTotal,
    isOverCap,
}: TeamBuilderMeterBarProps) => {
    const pct = Math.min(100, (salaryUsed / salaryCap) * 100)

    return (
        <div className="border-b border-foreground/10 bg-muted/40">
            <div className="container mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-6 py-3">
                <div className="flex items-center gap-3">
                    <div className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                        Roster
                    </div>
                    <div className="font-anton text-xl leading-none">
                        <span>{filledCount}</span>
                        <span className="text-muted-foreground">/{rosterSize}</span>
                    </div>
                </div>

                <div className="min-w-[200px] flex-1">
                    <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-semibold tracking-wider text-muted-foreground uppercase">
                            Salary cap
                        </span>
                        <span className="font-mono">
                            <span>{money(salaryUsed)}</span>{' '}
                            <span className="text-muted-foreground">/ {money(salaryCap)}</span>
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
                            isOverCap && 'text-primary',
                        )}
                    >
                        {money(salaryLeft)}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                        Projected
                    </div>
                    <div className="font-anton text-xl leading-none text-primary">
                        {projTotal.toFixed(1)}
                    </div>
                </div>
            </div>
        </div>
    )
}
