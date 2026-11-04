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
    const facts = [
        { label: 'Closes', value: lockTime(closes) },
        { label: 'Format', value: contestSeriesLabel(next) },
        { label: 'Entered', value: number(next.memberCount) },
        { label: 'Entry', value: entryFeeLabel(next.entryFeeCredits) },
    ]

    return (
        <section aria-labelledby="next-move-title" className="rounded-md bg-board p-1.5 text-board-foreground shadow-[0_18px_40px_-24px_rgba(18,53,36,0.9)]">
            <div className="rounded-[4px] border border-board-line p-6 sm:p-8">
                <p className="flex items-center gap-2 text-sm font-medium text-board-foreground/70">
                    <span className="size-2 rounded-full bg-lamp motion-safe:animate-pulse" aria-hidden="true" />
                    {entered ? 'You’re in' : 'Open for entries'}
                </p>
                <h2 id="next-move-title" className="mt-3 font-anton text-5xl uppercase leading-[0.95] text-lamp sm:text-7xl">
                    <span className="block text-2xl text-board-foreground sm:text-3xl">{entered ? 'Lineup locks in' : 'Entries close in'}</span>
                    {formatCountdown(closes, now.getTime())}
                </h2>
                <p className="mt-4 text-base font-medium">{next.name}</p>
                <dl className="mt-6 grid grid-cols-2 border-t border-board-line sm:grid-cols-[1.5fr_1fr_1fr_0.8fr]">
                    {facts.map(item => (
                        <div key={item.label} className="border-b border-board-line py-3 pr-4 sm:border-b-0 sm:border-r sm:px-4 sm:first:pl-0 sm:last:border-r-0">
                            <dt className="text-sm text-board-foreground/60">{item.label}</dt>
                            <dd className="mt-0.5 text-sm font-semibold">{item.value}</dd>
                        </div>
                    ))}
                </dl>
                <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
                    <Link href={contestHref(next)} className={buttonVariants({ size: 'lg', className: 'gap-3 bg-lamp text-board hover:bg-lamp/90' })}>
                        {next.kind === 'DAILY' ? (entered ? 'Edit your lineup' : 'Build your lineup') : (entered ? 'View your entry' : 'Join now')}<ArrowUpRight className="size-4" aria-hidden="true" />
                    </Link>
                    <Link href="/rules" className="text-sm font-medium text-board-foreground/80 underline-offset-4 hover:text-white hover:underline">How scoring works</Link>
                </div>
            </div>
        </section>
    )
}
