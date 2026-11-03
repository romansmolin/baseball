import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

import type { ContestCatalogItem } from '@/shared/tournaments'
import { Button, buttonVariants } from '@/shared/ui/button'
import { closingTime, contestHref, contestSeriesLabel, entryFeeLabel, formatCountdown } from '../model/dashboard-home'
import { number } from './showcase-primitives'

const lockTime = (ms: number) => new Intl.DateTimeFormat(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
}).format(ms)

const STEPS = [
    { title: 'Pick nine players', text: 'Fill every position and stay under the salary cap.' },
    { title: 'Name a captain', text: 'Your captain earns bonus points.' },
    { title: 'Score from real games', text: 'Points come from real box scores.' },
]

interface NextMoveProps {
    next: ContestCatalogItem | null
    entered: boolean
    now: Date | null
    hasEntries: boolean
    loading: boolean
    failed: boolean
    onRetry: () => void
}

function Facts({ items }: { items: { label: string; value: string }[] }) {
    return (
        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-primary/20 pt-5 sm:grid-cols-4">
            {items.map(item => (
                <div key={item.label}>
                    <dt className="text-sm text-muted-foreground">{item.label}</dt>
                    <dd className="mt-0.5 text-sm font-medium">{item.value}</dd>
                </div>
            ))}
        </dl>
    )
}

export function NextMove({ next, entered, now, hasEntries, loading, failed, onRetry }: NextMoveProps) {
    if (loading) {
        return <div className="h-64 animate-pulse rounded-xl bg-muted" role="status" aria-label="Loading your next contest" />
    }

    if (failed) {
        return (
            <section role="alert" className="rounded-xl border border-foreground/10 p-6 sm:p-8">
                <h2 className="text-xl font-semibold">We couldn’t load the contest schedule</h2>
                <p className="mt-2 text-sm text-muted-foreground">Check your connection and try again.</p>
                <Button variant="outline" className="mt-5" onClick={onRetry}>Try again</Button>
            </section>
        )
    }

    if (!next || !now) {
        return (
            <section aria-labelledby="next-move-title" className="rounded-xl border border-foreground/10 p-6 sm:p-8">
                <h2 id="next-move-title" className="font-anton text-3xl uppercase leading-none sm:text-4xl">No contest is open right now</h2>
                <p className="mt-4 max-w-prose text-sm leading-relaxed text-muted-foreground">
                    New contests open when MLB, Triple-A or Double-A games are on the schedule. Until then you can review finished contests and see how every lineup scored.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
                    <Link href="/contests?view=history" className={buttonVariants({ size: 'lg' })}>See finished contests</Link>
                    <Link href="/rules" className="text-sm font-medium hover:text-primary">How scoring works</Link>
                </div>
                {!hasEntries && (
                    <ol className="mt-8 grid gap-5 border-t border-foreground/10 pt-6 sm:grid-cols-3">
                        {STEPS.map((step, index) => (
                            <li key={step.title}>
                                <p className="text-sm font-medium"><span className="mr-2 font-anton text-primary">{index + 1}</span>{step.title}</p>
                                <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
                            </li>
                        ))}
                    </ol>
                )}
            </section>
        )
    }

    const closes = closingTime(next)

    return (
        <section aria-labelledby="next-move-title" className="rounded-xl border border-primary/30 bg-primary/[0.06] p-6 sm:p-8">
            <p className="text-sm font-medium text-primary">{entered ? 'You’re in' : 'Open for entries'}</p>
            <h2 id="next-move-title" className="mt-2 font-anton text-4xl uppercase leading-none sm:text-5xl">
                {entered ? 'Lineup locks in ' : 'Entries close in '}{formatCountdown(closes, now.getTime())}
            </h2>
            <p className="mt-4 text-base font-medium">{next.name}</p>
            <Facts items={[
                { label: 'Closes', value: lockTime(closes) },
                { label: 'Format', value: contestSeriesLabel(next) },
                { label: 'Entered so far', value: number(next.memberCount) },
                { label: 'Entry', value: entryFeeLabel(next.entryFeeCredits) },
            ]} />
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
                <Link href={contestHref(next)} className={buttonVariants({ size: 'lg', className: 'gap-3' })}>
                    {next.kind === 'DAILY' ? (entered ? 'Edit your lineup' : 'Build your lineup') : (entered ? 'View your entry' : 'Join now')}<ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
                <Link href="/rules" className="text-sm font-medium hover:text-primary">How scoring works</Link>
            </div>
        </section>
    )
}
