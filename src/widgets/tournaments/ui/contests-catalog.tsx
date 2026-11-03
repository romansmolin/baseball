'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { ContestCatalogItem, ContestCatalogKind, ContestCatalogView } from '@/shared/tournaments'
import { useContestCatalogData } from '@/entities/tournaments'
import { Button, buttonVariants } from '@/shared/ui/button'
import { cn } from '@/shared/utils'
import { LoadState, PageNavigation, number, timestamp } from '@/widgets/showcase/ui/showcase-primitives'

const PAGE_SIZE = 20
const KIND_OPTIONS: { value: ContestCatalogKind | 'ALL'; label: string }[] = [
    { value: 'ALL', label: 'All formats' },
    { value: 'DAILY', label: 'Daily' },
    { value: 'SERIES', label: 'Series' },
    { value: 'LEAGUE', label: 'Leagues' },
]

function statusLabel(item: ContestCatalogItem): string {
    if (item.status === 'OPEN' || item.status === 'DRAFTING') return 'Open for entries'
    if (item.status === 'LOCKED' || item.status === 'IN_SEASON' || item.status === 'PLAYOFFS') return 'In progress'
    if (item.status === 'CANCELLED') return 'Cancelled'
    return 'Results'
}

function formatDate(item: ContestCatalogItem, view: ContestCatalogView): string {
    const start = new Date(view === 'history' ? item.endsAt : item.startsAt)
    const date = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    if (item.kind === 'DAILY') return date
    const end = new Date(item.endsAt)
    return `${date} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
}

function kindLabel(item: ContestCatalogItem): string {
    if (item.kind === 'DAILY') return item.slateKey === 'weekend' ? 'Weekend Series' : 'Daily Lineup'
    if (item.kind === 'SERIES') return item.templateKey?.replaceAll('-', ' ') ?? 'Fantasy Series'
    return 'League tournament'
}

function sourceLabel(slug: string): string {
    if (slug === 'north-america') return 'North American Leagues'
    if (slug === 'winter-leagues') return 'Winter Leagues'
    if (slug === 'triple-a') return 'Triple-A'
    if (slug === 'double-a') return 'Double-A'
    return slug.toUpperCase()
}

function itemHref(item: ContestCatalogItem, view: ContestCatalogView): string {
    return item.kind === 'DAILY'
        ? `/contests/${encodeURIComponent(item.id)}?view=${view}`
        : `/tournaments?tournament=${encodeURIComponent(item.id)}`
}

function ContestCard({ item, view }: { item: ContestCatalogItem; view: ContestCatalogView }) {
    const href = itemHref(item, view)
    const dateLabel = formatDate(item, view)
    const deadline = item.locksAt ? timestamp(item.locksAt) : null
    const joinable = item.status === 'OPEN' || item.status === 'DRAFTING'
    const sourceNames = item.sourceLeagues?.map(sourceLabel).join(' · ') || sourceLabel(item.leagueSlug)
    return <article className="flex flex-col gap-3 rounded-xl border border-foreground/10 bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{kindLabel(item)} · {sourceNames}</span>
            <span className={cn('rounded-full px-2 py-1 text-[11px]', item.status === 'OPEN' || item.status === 'DRAFTING' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>{statusLabel(item)}</span>
        </div>
        <Link href={href} className="font-anton text-xl tracking-wide hover:text-primary">{item.name}</Link>
        <p className="text-xs text-muted-foreground">{dateLabel}{deadline ? ` · Lineups lock ${deadline}` : ''}</p>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-foreground/10 pt-3">
            <span className="text-xs text-muted-foreground">{number(item.memberCount)} entries · {item.entryFeeCredits === 0 ? 'Free entry' : `${item.entryFeeCredits} credits`}</span>
            <Link href={href} className={buttonVariants({ size: 'sm', variant: joinable && view === 'current' ? 'default' : 'outline' })}>{view === 'history' ? 'View results' : joinable ? 'Join contest' : 'View contest'}</Link>
        </div>
    </article>
}

export function ContestsCatalog({ initialView = 'current' }: { initialView?: ContestCatalogView }) {
    const [view, setView] = useState<ContestCatalogView>(initialView)
    const [kind, setKind] = useState<ContestCatalogKind | 'ALL'>('ALL')
    const [searchText, setSearchText] = useState('')
    const [search, setSearch] = useState('')
    const [offset, setOffset] = useState(0)
    const { data, isLoading, error } = useContestCatalogData({ view, kind, search, limit: PAGE_SIZE, offset })

    const changeView = (value: ContestCatalogView) => { setView(value); setOffset(0) }
    const changeKind = (value: ContestCatalogKind | 'ALL') => { setKind(value); setOffset(0) }
    const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setSearch(searchText.trim())
        setOffset(0)
    }

    return <div className="container mx-auto max-w-7xl space-y-6 px-6 py-8">
        <div><p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">One lineup per contest</p><h1 className="mt-2 font-anton text-3xl">Contests</h1><p className="mt-2 text-sm text-muted-foreground">Daily lineups, weekend slates, recurring series and public league tournaments.</p></div>
        <div className="flex flex-wrap gap-2" aria-label="Contest view">
            <Button variant={view === 'current' ? 'default' : 'outline'} aria-pressed={view === 'current'} onClick={() => changeView('current')}>Current & upcoming</Button>
            <Button variant={view === 'history' ? 'default' : 'outline'} aria-pressed={view === 'history'} onClick={() => changeView('history')}>Results</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs text-muted-foreground">Format <select aria-label="Contest format" className="ml-2 rounded-md border border-foreground/15 bg-card px-2 py-2 text-foreground" value={kind} onChange={event => changeKind(event.target.value as ContestCatalogKind | 'ALL')}>{KIND_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <form className="flex gap-2" onSubmit={submitSearch}>
                <input aria-label="Search contests" className="w-56 rounded-md border border-foreground/15 bg-card px-3 py-2 text-sm" placeholder="Search by contest name" value={searchText} onChange={event => setSearchText(event.target.value)} />
                <Button type="submit" variant="outline">Search</Button>
            </form>
            {search && <Button type="button" variant="ghost" onClick={() => { setSearch(''); setSearchText(''); setOffset(0) }}>Clear search</Button>}
        </div>
        <p className="text-xs text-muted-foreground">{view === 'history' ? 'Completed contests and published results.' : 'Real schedules determine when contests open. Lineups lock before the first included game.'}</p>
        <LoadState loading={isLoading} error={error && !data} empty={data?.items.length === 0}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data?.items.map(item => <ContestCard key={`${item.kind}:${item.id}`} item={item} view={view} />)}</div>
        </LoadState>
        {!isLoading && !error && data?.items.length === 0 && <p className="text-sm text-muted-foreground">No contests match this view yet. Check back after the next real game schedule update.</p>}
        {data && <PageNavigation offset={offset} total={data.total} onChange={setOffset} />}
    </div>
}
