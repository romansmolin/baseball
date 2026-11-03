'use client'

import Link from 'next/link'
import { ArrowRight, ArrowUpRight } from 'lucide-react'

import { useManagersData } from '@/entities/showcase'
import type { DailyEntryRecord } from '@/shared/daily-contests'
import { LoadState, ManagerAvatar, number } from './showcase-primitives'

export function DashboardCorner({ entry }: { entry: DailyEntryRecord | null | undefined }) {
    return (
        <section className="min-w-0" aria-labelledby="your-corner-title">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 id="your-corner-title" className="text-base font-semibold">Your corner</h2><Link href="/teams" className="inline-flex items-center gap-1.5 text-xs font-medium hover:text-primary">My teams<ArrowRight className="size-3.5" aria-hidden="true" /></Link></div>
            {entry ? <><p className="text-xs text-muted-foreground">Your saved daily lineup</p><h3 className="mt-1 break-words text-lg font-medium">{entry.teamName}</h3><p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">Your picks are saved. Open the contest to follow your lineup and its results.</p></> : <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">Pick a lineup, follow your results, and build your season one contest at a time.</p>}
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-4">
                <Link href="/rules" className="inline-flex items-center gap-1.5 text-xs font-medium hover:text-primary">How scoring works<ArrowUpRight className="size-3.5" aria-hidden="true" /></Link>
                <Link href="/contests?view=history" className="inline-flex items-center gap-1.5 text-xs font-medium hover:text-primary">Contest results<ArrowUpRight className="size-3.5" aria-hidden="true" /></Link>
            </div>
        </section>
    )
}

export function DashboardLeaders() {
    const { data, isLoading, error } = useManagersData({ mode: 'LIVE', period: 'season', limit: 3, offset: 0 })
    const ranked = data?.items.filter(manager => manager.rank !== null) ?? []

    return (
        <section className="min-w-0" aria-labelledby="dashboard-leaders-title">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3"><h2 id="dashboard-leaders-title" className="text-base font-semibold">Setting the pace</h2><Link href="/managers?mode=LIVE" className="inline-flex items-center gap-1.5 text-xs font-medium hover:text-primary">This season<ArrowRight className="size-3.5" aria-hidden="true" /></Link></div>
            <LoadState loading={isLoading && !data} error={error && !data} empty={!!data && ranked.length === 0}>
                <ol className="divide-y divide-foreground/10">
                    {ranked.map(manager => <li key={manager.userId}><Link href={`/managers/${encodeURIComponent(manager.userId)}`} className="flex items-center gap-3 py-3.5 transition-colors hover:text-primary">
                        <span className="w-4 shrink-0 text-xs tabular-nums text-muted-foreground">{manager.rank}</span><ManagerAvatar image={manager.image} name={manager.name} className="size-9" /><span className="min-w-0 flex-1 break-words text-sm font-medium">{manager.name}</span><span className="shrink-0 text-sm font-medium tabular-nums">{number(manager.points)} <span className="text-xs font-normal text-muted-foreground">pts</span></span>
                    </Link></li>)}
                </ol>
            </LoadState>
            {error && data && <p className="mt-2 text-xs text-muted-foreground" role="status">Showing the last saved standings.</p>}
        </section>
    )
}
