'use client'

import Link from 'next/link'
import { Trophy } from 'lucide-react'

import type { ContestCatalogItem } from '@/shared/tournaments'
import { cn } from '@/shared/utils'
import { barWidth, contestHref, contestSeriesLabel, winningMargin } from '../model/dashboard-home'
import { useContestPodium, type useTodayState } from '../model/use-dashboard-home'
import { ManagerAvatar, number } from './showcase-primitives'

type TodayState = ReturnType<typeof useTodayState>

const RESULT_CARDS = 4

const part = (date: Date, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'America/New_York' }).format(date)

interface ResultCardProps {
    item: ContestCatalogItem
    userId: string | undefined
    myPoints: number | undefined
}

function ResultCard({ item, userId, myPoints }: ResultCardProps) {
    const { standings, loading } = useContestPodium(item.kind === 'DAILY' ? item.id : null)
    const podium = standings.slice(0, 3)
    const top = podium[0]?.points ?? 0
    const margin = winningMargin(standings)
    const mine = userId ? standings.find(entry => entry.userId === userId) : undefined
    const date = new Date(item.startsAt)

    return (
        <li>
            <Link
                href={contestHref(item)}
                className="group flex h-full flex-col rounded-xl border border-foreground/10 bg-card p-5 transition-colors hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
                <div className="flex items-start justify-between gap-3">
                    <time dateTime={item.startsAt} className="font-anton text-3xl leading-none">
                        {part(date, { day: 'numeric' })}
                        <span className="ml-1.5 font-sans text-sm font-normal text-muted-foreground">{part(date, { month: 'short' })}</span>
                    </time>
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">Final</span>
                </div>
                <h3 className="mt-3 text-base font-semibold leading-snug">{item.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    {[
                        item.name.startsWith(contestSeriesLabel(item)) ? null : contestSeriesLabel(item),
                        `${number(item.memberCount)} ${item.memberCount === 1 ? 'entry' : 'entries'}`,
                        margin !== null ? `won by ${number(margin)} pts` : null,
                    ].filter(Boolean).join(' · ')}
                </p>

                {loading ? (
                    <div className="mt-4 space-y-1.5" role="status" aria-label="Loading the top three">{[0, 1, 2].map(i => <div key={i} className="h-9 animate-pulse rounded-md bg-muted" />)}</div>
                ) : podium.length > 0 && (
                    <ol className="mt-4 space-y-1.5">
                        {podium.map((entry, index) => (
                            <li key={entry.entryId} className={cn('relative overflow-hidden rounded-md', entry.userId === userId && 'ring-1 ring-primary')}>
                                <span aria-hidden="true" className={cn('absolute inset-y-0 left-0', index === 0 ? 'bg-primary/25' : 'bg-muted')} style={{ width: `${barWidth(entry.points, top)}%` }} />
                                <span className="relative flex items-center gap-2.5 px-2.5 py-2 text-sm">
                                    <span className="flex w-4 justify-center">
                                        {index === 0 ? <Trophy className="size-3.5 text-primary" aria-label="Winner" /> : <span className="tabular-nums text-muted-foreground">{entry.rank}</span>}
                                    </span>
                                    <ManagerAvatar image={entry.image} name={entry.userName} className="size-6" />
                                    <span className="min-w-0 flex-1 truncate font-medium">{entry.userName}</span>
                                    <span className="font-medium tabular-nums">{number(entry.points)}</span>
                                </span>
                            </li>
                        ))}
                    </ol>
                )}

                <p className="mt-auto pt-4 text-sm">
                    {mine ? <>You finished <span className="font-medium">#{mine.rank}</span> with {number(mine.points)} pts</>
                        : myPoints !== undefined ? <>You scored <span className="font-medium">{number(myPoints)} pts</span></>
                        : <span className="text-muted-foreground group-hover:text-primary">See every lineup</span>}
                </p>
            </Link>
        </li>
    )
}

export function ResultsSection({ state }: { state: TodayState }) {
    const items = state.finished.slice(0, RESULT_CARDS)

    return (
        <section aria-labelledby="results-title" className="mt-10">
            <div className="flex items-baseline justify-between gap-4 pb-3">
                <h2 id="results-title" className="text-xl font-semibold">Latest results</h2>
                <Link href="/contests?view=history" className="text-sm font-medium text-primary hover:underline">All results</Link>
            </div>
            {state.resultsLoading ? <div className="grid gap-4 sm:grid-cols-2" role="status" aria-label="Loading latest results">{[0, 1].map(i => <div key={i} className="h-64 animate-pulse rounded-xl bg-muted" />)}</div>
                : state.resultsFailed ? <p role="alert" className="border-t border-foreground/10 pt-4 text-sm text-muted-foreground">We couldn’t load the latest results. Refresh the page to try again.</p>
                : items.length === 0 ? <p className="border-t border-foreground/10 pt-4 text-sm text-muted-foreground">Finished contests appear here with their top three and your score.</p>
                : <ul className="grid gap-4 sm:grid-cols-2">{items.map(item => <ResultCard key={`${item.kind}:${item.id}`} item={item} userId={state.userId} myPoints={state.myPoints.get(item.id)} />)}</ul>}
        </section>
    )
}
