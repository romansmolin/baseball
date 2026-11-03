'use client'

import Link from 'next/link'
import { useMyTournamentsData, useContestCatalogData } from '@/entities/tournaments'
import { useMyActiveDailyEntriesData } from '@/entities/showcase'
import type { ContestCatalogItem } from '@/shared/tournaments'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { LoadState, number } from './showcase-primitives'

function contestHref(item: ContestCatalogItem, view: 'current' | 'history' = 'current') {
    return item.kind === 'DAILY'
        ? `/contests/${encodeURIComponent(item.id)}?view=${view}`
        : `/tournaments?tournament=${encodeURIComponent(item.id)}`
}

function seriesName(item: ContestCatalogItem) {
    if (item.kind === 'DAILY') return item.slateKey === 'weekend' ? 'Weekend Series' : 'Daily Lineup'
    if (item.kind === 'SERIES') return item.templateKey?.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join(' ') ?? 'Fantasy Series'
    return 'League tournament'
}

function localTime(value: string) {
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(value))
}

function CatalogLink({ item, label, view }: { item: ContestCatalogItem; label: string; view?: 'current' | 'history' }) {
    return <Link href={contestHref(item, view)} className="group flex items-center justify-between gap-3 py-2.5 text-sm hover:text-primary">
        <span className="min-w-0"><span className="block truncate font-medium">{item.name}</span><span className="mt-0.5 block text-xs text-muted-foreground">{seriesName(item)} · {number(item.memberCount)} entries</span></span>
        <span className="shrink-0 text-xs text-muted-foreground group-hover:text-primary">{label}</span>
    </Link>
}

export function TodayContestPanel({ authenticated, dailyEnabled = true }: { authenticated: boolean; dailyEnabled?: boolean }) {
    const current = useContestCatalogData({ view: 'current', limit: 100, offset: 0 })
    const history = useContestCatalogData({ view: 'history', limit: 3, offset: 0 })
    const mine = useMyTournamentsData(authenticated)
    const dailyEntries = useMyActiveDailyEntriesData(authenticated && dailyEnabled)
    const items = current.data?.items ?? []
    const next = items.find(item => item.status === 'OPEN' || item.status === 'DRAFTING') ?? items[0]
    const activeDailyEntries = dailyEntries.data?.items ?? []
    const activeEntries = (mine.data ?? []).filter(item => ['DRAFTING', 'IN_SEASON', 'PLAYOFFS'].includes(item.status))
    const recent = history.data?.items ?? []
    const joinedNext = next?.kind === 'DAILY' && activeDailyEntries.some(entry => entry.contestId === next.id)
    const nextLabel = !next ? 'View' : joinedNext ? 'Already joined'
        : ['LOCKED', 'IN_SEASON', 'PLAYOFFS'].includes(next.status) ? 'In progress'
            : next.locksAt ? `Locks ${localTime(next.locksAt)}` : 'Join'

    return <Card role="region" aria-label="Today’s contests">
        <CardHeader className="pb-3"><CardTitle>Today</CardTitle></CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-3">
            <section aria-labelledby="today-next-contest">
                <h3 id="today-next-contest" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next contest</h3>
                {current.isLoading && !current.data ? <p className="py-3 text-sm text-muted-foreground" role="status">Loading the contest schedule…</p>
                    : current.error && !current.data ? <p role="alert" className="py-3 text-sm text-muted-foreground">Couldn’t load the contest schedule. Please try again.</p>
                        : !next ? <p className="py-3 text-sm text-muted-foreground">No eligible games are scheduled for a new contest yet.</p>
                            : <div className="mt-1"><CatalogLink item={next} label={nextLabel} />
                        <Link href="/contests" className="mt-1 inline-block text-xs font-medium text-primary hover:underline">All contests →</Link>
                    </div>}
                {current.error && current.data && <p role="status" className="text-xs text-muted-foreground">Showing saved contests; the schedule could not be refreshed.</p>}
            </section>

            <section aria-labelledby="today-active-entries">
                <h3 id="today-active-entries" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your active entries</h3>
                {!authenticated ? <p className="py-3 text-sm text-muted-foreground">Sign in to see your entries.</p>
                    : (mine.isLoading || dailyEnabled && dailyEntries.isLoading) && !mine.data && !dailyEntries.data ? <p className="py-3 text-sm text-muted-foreground" role="status">Loading your entries…</p>
                    : (mine.error && !mine.data) || (dailyEnabled && dailyEntries.error && !dailyEntries.data) ? <p role="alert" className="py-3 text-sm text-muted-foreground">Couldn’t load your entries.</p>
                    : <>
                        {activeDailyEntries.map(entry => <Link key={entry.entryId} href={`/contests/${encodeURIComponent(entry.contestId)}`} className="group flex items-center justify-between gap-3 py-2.5 text-sm hover:text-primary"><span className="min-w-0"><span className="block truncate font-medium">{entry.contestName}</span><span className="mt-0.5 block text-xs text-muted-foreground">{entry.slateKey === 'weekend' ? 'Weekend Series' : 'Daily Lineup'} · Locks {localTime(entry.locksAt)}</span></span><span className="shrink-0 text-xs text-muted-foreground">{entry.status === 'OPEN' ? 'Entered' : 'In progress'}</span></Link>)}
                        {activeEntries.map(tournament => {
                            const item = items.find(candidate => candidate.id === tournament.id)
                            return <Link key={tournament.id} href={`/tournaments?tournament=${encodeURIComponent(tournament.id)}`} className="group flex items-center justify-between gap-3 py-2.5 text-sm hover:text-primary"><span className="min-w-0"><span className="block truncate font-medium">{tournament.name}</span><span className="mt-0.5 block text-xs text-muted-foreground">{item ? seriesName(item) : 'Tournament'} · {number(tournament.memberCount)} entries · Started {localTime(tournament.startsAt)}</span></span><span className="shrink-0 text-xs text-muted-foreground">In progress</span></Link>
                        })}
                        {activeDailyEntries.length === 0 && activeEntries.length === 0 && mine.data && (!dailyEnabled || dailyEntries.data) && <p className="py-3 text-sm text-muted-foreground">No active contest entries yet.</p>}
                    </>}
            </section>

            <section aria-labelledby="today-recent-results">
                <div className="flex items-center justify-between gap-2"><h3 id="today-recent-results" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent results</h3><Link href="/contests?view=history" className="text-xs text-primary hover:underline">All results</Link></div>
                <LoadState loading={history.isLoading && !history.data} error={history.error && !history.data} empty={!history.isLoading && !history.error && recent.length === 0}>
                    {recent.map(item => <CatalogLink key={`${item.kind}:${item.id}`} item={item} label="Results" view="history" />)}
                </LoadState>
            </section>
        </CardContent>
    </Card>
}
