'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { useManagerData } from '@/entities/showcase'
import { Button } from '@/shared/ui/button'
import { countryLabel, formSeries } from '../model/manager-standing'
import { ManagerCard } from './manager-card'
import { date, number } from './showcase-primitives'

function FormChart({ form }: { form: ReturnType<typeof formSeries> }) {
    return (
        <section aria-labelledby="form-title">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <h2 id="form-title" className="text-lg font-semibold">Form</h2>
                <p className="text-sm text-muted-foreground">Last {form.series.length} {form.series.length === 1 ? 'contest' : 'contests'}: best {number(form.best)}, average {number(form.average)}</p>
            </div>
            <ol className="mt-4 flex h-32 items-end gap-1 border-b border-foreground/15" aria-label="Points in each recent contest, oldest first">
                {form.series.map(entry => (
                    <li key={entry.entryId} className="group relative flex h-full min-w-0 flex-1 items-end" title={`${entry.contest.name}: ${number(entry.points)} pts`}>
                        <span className="w-full rounded-t-sm bg-primary/60 transition-colors group-hover:bg-primary" style={{ height: `${form.best > 0 ? Math.max(3, entry.points / form.best * 100) : 3}%` }} />
                        <span className="sr-only">{entry.contest.name}: {number(entry.points)} points</span>
                    </li>
                ))}
            </ol>
        </section>
    )
}

export function ManagerProfilePanel({ userId }: { userId: string }) {
    const { data, isLoading, error, mutate } = useManagerData(userId)
    const form = formSeries(data?.history ?? [])

    return (
        <div>
            <Link href="/managers" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
                <ArrowLeft className="size-3.5" aria-hidden="true" />All managers
            </Link>
            {isLoading && !data ? (
                <div className="mt-6 grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]" role="status" aria-label="Loading manager">
                    <div className="aspect-[5/7] animate-pulse rounded-xl bg-muted" />
                    <div className="h-64 animate-pulse rounded bg-muted" />
                </div>
            ) : error && !data ? (
                <div role="alert" className="mt-6">
                    <p className="text-sm text-muted-foreground">We couldn’t load this manager. Check your connection and try again.</p>
                    <Button variant="outline" className="mt-4" onClick={() => mutate()}>Try again</Button>
                </div>
            ) : data && (
                <div className="mt-6 grid items-start gap-8 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-12">
                    <div className="mx-auto w-full max-w-72 lg:sticky lg:top-24">
                        <h1 className="sr-only">{data.name}</h1>
                        <ManagerCard
                            name={data.name}
                            image={data.image}
                            subtitle={countryLabel(data.countryCode)}
                            rank={data.rank}
                            lead={data.rank !== null && data.rank <= 3}
                            stats={[
                                { label: 'Points', value: number(data.points) },
                                { label: 'Contests', value: number(data.entries) },
                                { label: 'Average', value: number(data.entries > 0 ? data.points / data.entries : 0) },
                            ]}
                        />
                        <dl className="mt-3 space-y-1 px-1 text-sm">
                            {data.favoriteTeamName && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Favorite club</dt><dd className="truncate text-right">{data.favoriteTeamName}</dd></div>}
                            {data.rank !== null && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Season rank</dt><dd>#{number(data.rank)} of {number(data.rankedManagers)}</dd></div>}
                        </dl>
                    </div>

                    <div className="min-w-0 space-y-10">
                        {form.series.length > 1 && <FormChart form={form} />}
                        <section aria-labelledby="history-title">
                            <h2 id="history-title" className="pb-3 text-lg font-semibold">Contest history</h2>
                            {data.history.length === 0 ? (
                                <p className="border-t border-foreground/10 pt-4 text-sm text-muted-foreground">No finished contests yet.</p>
                            ) : (
                                <ol>
                                    {data.history.map(entry => (
                                        <li key={entry.entryId}>
                                            <Link
                                                href={`/contests/${encodeURIComponent(entry.contest.id)}?view=history`}
                                                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 border-t border-foreground/10 py-3 transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
                                            >
                                                <span className="min-w-0">
                                                    <span className="block truncate font-medium">{entry.contest.name}</span>
                                                    <span className="mt-0.5 block truncate text-sm text-muted-foreground">{date(entry.contest.contestDate)}</span>
                                                </span>
                                                <span className="text-right font-semibold tabular-nums">{number(entry.points)} <span className="text-xs font-normal text-muted-foreground">pts</span></span>
                                            </Link>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </section>
                    </div>
                </div>
            )}
        </div>
    )
}
