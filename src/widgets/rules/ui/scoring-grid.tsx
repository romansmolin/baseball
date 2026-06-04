import { BaseballBatIcon, BaseballIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { cn } from '@/shared/utils'

import {
    STANDARD_SCORING_RULE,
    type ScoringRuleCategory,
    type ScoringRuleEntry,
} from '../model/scoring-rule.const'

const CATEGORIES: {
    key: ScoringRuleCategory
    title: string
    icon: typeof BaseballBatIcon
    tint: string
}[] = [
    {
        key: 'batting',
        title: 'Batting',
        icon: BaseballBatIcon,
        tint: 'from-emerald-400/15 via-emerald-400/5 to-transparent',
    },
    {
        key: 'pitching',
        title: 'Pitching',
        icon: BaseballIcon,
        tint: 'from-sky-400/15 via-sky-400/5 to-transparent',
    },
]

const formatPoints = (points: number): string => {
    const rounded = Number.isInteger(points) ? points.toString() : points.toFixed(2)
    return points > 0 ? `+${rounded}` : rounded
}

interface CategoryColumnProps {
    title: string
    icon: typeof BaseballBatIcon
    tint: string
    entries: ScoringRuleEntry[]
}

const CategoryColumn = ({ title, icon, tint, entries }: CategoryColumnProps) => (
    <div
        className={cn(
            'relative overflow-hidden rounded-3xl border border-foreground/10 bg-linear-to-br p-6',
            tint,
        )}
    >
        <div className="mb-5 flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-foreground/5">
                <HugeiconsIcon icon={icon} className="size-4 text-foreground" />
            </span>
            <h2 className="font-anton text-2xl tracking-wide">{title}</h2>
        </div>

        <ul className="space-y-2.5">
            {entries.map((entry) => {
                const isPenalty = entry.points < 0
                return (
                    <li
                        key={entry.key}
                        className="flex items-start justify-between gap-4 rounded-xl bg-background/60 p-3 ring-1 ring-foreground/5 backdrop-blur"
                    >
                        <div className="min-w-0">
                            <p className="font-medium">{entry.label}</p>
                            <p className="text-xs text-muted-foreground">
                                {entry.description}
                            </p>
                        </div>
                        <span
                            className={cn(
                                'shrink-0 rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums',
                                isPenalty
                                    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-300'
                                    : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
                            )}
                        >
                            {formatPoints(entry.points)}
                        </span>
                    </li>
                )
            })}
        </ul>
    </div>
)

export const ScoringGrid = () => (
    <section>
        <div className="mb-4 flex items-center justify-between">
            <h2 className="font-anton text-2xl tracking-wide">Point values</h2>
            <span className="rounded-full bg-foreground/5 px-3 py-1 text-xs text-muted-foreground">
                Captain slot multiplies these by ×1.5
            </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
            {CATEGORIES.map((cat) => (
                <CategoryColumn
                    key={cat.key}
                    title={cat.title}
                    icon={cat.icon}
                    tint={cat.tint}
                    entries={STANDARD_SCORING_RULE.filter((e) => e.category === cat.key)}
                />
            ))}
        </div>
    </section>
)
