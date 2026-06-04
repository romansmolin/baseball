import {
    Coins01Icon,
    Crown02Icon,
    HourglassIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { cn } from '@/shared/utils'

import { CAPTAIN_MULTIPLIER, SALARY_CAP_DEFAULT } from '@/shared/team-builder'

interface Concept {
    title: string
    body: string
    icon: typeof Crown02Icon
    accent: string
    badge: string
}

const CONCEPTS: Concept[] = [
    {
        title: 'Captain multiplier',
        body: `Designate one player as captain to multiply their points by ×${CAPTAIN_MULTIPLIER}. Pick a heavy hitter — the math compounds fast.`,
        icon: Crown02Icon,
        accent:
            'from-fuchsia-500/20 via-fuchsia-500/5 to-transparent border-fuchsia-500/30',
        badge: 'bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300',
    },
    {
        title: 'Salary cap',
        body: `Roster nine players under a $${(SALARY_CAP_DEFAULT / 1000).toFixed(0)}k cap. Salaries lock the moment you save your lineup.`,
        icon: Coins01Icon,
        accent:
            'from-amber-400/20 via-amber-400/5 to-transparent border-amber-400/30',
        badge: 'bg-amber-400/15 text-amber-700 dark:text-amber-300',
    },
    {
        title: 'Weekly scoring',
        body: 'Tournaments run on a weekly cadence. Once a game enters FINAL we lock the points in — partial weeks update as games complete.',
        icon: HourglassIcon,
        accent:
            'from-sky-500/20 via-sky-500/5 to-transparent border-sky-500/30',
        badge: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
    },
]

export const ConceptsGrid = () => (
    <section>
        <h2 className="mb-4 font-anton text-2xl tracking-wide">Core concepts</h2>
        <div className="grid gap-4 md:grid-cols-3">
            {CONCEPTS.map((c) => (
                <article
                    key={c.title}
                    className={cn(
                        'relative overflow-hidden rounded-3xl border bg-linear-to-br p-6',
                        c.accent,
                    )}
                >
                    <span
                        className={cn(
                            'mb-4 inline-flex size-11 items-center justify-center rounded-2xl',
                            c.badge,
                        )}
                    >
                        <HugeiconsIcon icon={c.icon} className="size-5" />
                    </span>
                    <h3 className="font-anton text-xl tracking-wide">{c.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{c.body}</p>
                </article>
            ))}
        </div>
    </section>
)
