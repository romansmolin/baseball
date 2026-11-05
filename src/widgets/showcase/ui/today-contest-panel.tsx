'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

import type { ContestCatalogItem } from '@/shared/tournaments'
import { cn } from '@/shared/utils'
import { closingTime, contestHref, contestPhase, contestSeriesLabel, type ContestPhase } from '../model/dashboard-home'
import { useTodayState } from '../model/use-dashboard-home'
import { ResultsSection } from './result-cards'
import { number } from './showcase-primitives'

type TodayState = ReturnType<typeof useTodayState>

const PHASE_LABEL: Record<ContestPhase, string> = { open: 'Open', live: 'In play', final: 'Final' }
const PHASE_STYLE: Record<ContestPhase, string> = {
    open: 'bg-primary text-primary-foreground',
    live: 'border border-foreground/30',
    final: 'bg-muted text-muted-foreground',
}

const part = (date: Date, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'America/New_York' }).format(date)

function ContestRow({ item, entered, points }: { item: ContestCatalogItem; entered: boolean; points: number | undefined }) {
    const phase = contestPhase(item)
    const running = phase === 'live' && item.kind !== 'DAILY'
    const date = new Date(running ? item.endsAt : item.startsAt)
    const outcome = points !== undefined ? `You scored ${number(points)} pts` : entered ? 'You’re in' : phase === 'open' ? 'Not entered' : null

    return (
        <li>
            <Link
                href={contestHref(item)}
                className="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-x-4 border-t border-foreground/10 py-4 transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
            >
                <time dateTime={running ? item.endsAt : item.startsAt} className="text-center leading-none">
                    <span className="block text-sm text-muted-foreground">{part(date, { month: 'short' })}</span>
                    <span className="mt-1 block font-anton text-2xl">{part(date, { day: 'numeric' })}</span>
                </time>
                <span className="min-w-0">
                    <span className="block truncate font-medium">{item.name}</span>
                    <span className="mt-1 block truncate text-sm text-muted-foreground">{[
                        item.name.startsWith(contestSeriesLabel(item)) ? null : contestSeriesLabel(item),
                        running ? `ends ${part(date, { month: 'short', day: 'numeric' })}` : null,
                        `${number(item.memberCount)} ${item.memberCount === 1 ? 'entry' : 'entries'}`,
                    ].filter(Boolean).join(' · ')}</span>
                </span>
                <span className="flex flex-col items-end gap-1.5 text-right">
                    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', PHASE_STYLE[phase])}>{PHASE_LABEL[phase]}</span>
                    {outcome && <span className="text-sm text-muted-foreground">{outcome}</span>}
                </span>
            </Link>
        </li>
    )
}

const ROWS_PER_SECTION = 5

interface SectionProps {
    id: string
    title: string
    items: ContestCatalogItem[]
    empty: string
    state: TodayState
    action?: ReactNode
    moreHref?: string
    status?: 'loading' | 'failed' | null
}

function Section({ id, title, items, empty, state, action, moreHref = '/contests', status = null }: SectionProps) {
    const shown = items.slice(0, ROWS_PER_SECTION)
    const hidden = items.length - shown.length

    return (
        <section aria-labelledby={id} className="mt-10 first:mt-0">
            <div className="flex items-baseline justify-between gap-4 pb-3">
                <h2 id={id} className="text-xl font-semibold">{title}</h2>
                {action}
            </div>
            {status === 'loading' ? <div className="space-y-3" role="status" aria-label={`Loading ${title.toLowerCase()}`}>{[0, 1].map(i => <div key={i} className="h-16 animate-pulse rounded bg-muted" />)}</div>
                : status === 'failed' ? <p role="alert" className="border-t border-foreground/10 pt-4 text-sm text-muted-foreground">We couldn’t load this list. Refresh the page to try again.</p>
                : shown.length === 0 ? <p className="border-t border-foreground/10 pt-4 text-sm text-muted-foreground">{empty}</p>
                : <ul>{shown.map(item => <ContestRow key={`${item.kind}:${item.id}`} item={item} entered={state.enteredIds.has(item.id)} points={state.myPoints.get(item.id)} />)}</ul>}
            {hidden > 0 && <Link href={moreHref} className="block border-t border-foreground/10 pt-3 text-sm font-medium text-primary hover:underline">{hidden} more</Link>}
        </section>
    )
}

const fullDate = (ms: number) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' }).format(ms)

export function TodayLedger({ state }: { state: TodayState }) {
    const { today, thisMonth, nextMonths, later } = state.schedule
    const firstLater = later[0]
    const upcomingEmpty = firstLater
        ? `No contests start before ${fullDate(closingTime(firstLater))}. The next ones are listed below.`
        : 'Nothing is scheduled yet. Contests show up here once their games are announced.'

    if (state.loading) {
        return <div className="space-y-3" role="status" aria-label="Loading contests">{[0, 1, 2].map(i => <div key={i} className="h-16 animate-pulse rounded bg-muted" />)}</div>
    }
    if (state.failed) {
        return <p role="alert" className="text-sm text-muted-foreground">We couldn’t load contests. Refresh the page to try again.</p>
    }

    return (
        <div>
            <Section id="today-title" title="Today" items={today} state={state} empty="Nothing is open or in play today."
                action={<Link href="/contests" className="text-sm font-medium text-primary hover:underline">All contests</Link>} />
            <Section id="month-title" title="This month" items={thisMonth} state={state} empty="No more contests are scheduled this month." />
            <Section id="upcoming-title" title="Next 2 months" items={nextMonths} state={state} empty={upcomingEmpty} />
            {later.length > 0 && <Section id="later-title" title="Later" items={later} state={state} empty="" />}
            <ResultsSection state={state} />
        </div>
    )
}

export function TodayContestPanel({ userId }: { userId?: string }) {
    return <TodayLedger state={useTodayState(userId)} />
}
