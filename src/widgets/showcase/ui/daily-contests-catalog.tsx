'use client'
import Link from 'next/link'
import { useDailyContestsData, useShowcaseRefresh } from '@/entities/showcase'
import type { DailyContestView } from '@/shared/daily-contests'
import { useDailyContestsState } from '../model/use-daily-contests-state'
import { DailyContestCard } from './daily-contest-card'
import { ContestViewPicker, LoadState, PageNavigation } from './showcase-primitives'

export function DailyContestsCatalog({ initialView = 'current' }: { initialView?: DailyContestView }) {
    const { view, setView, offset, setOffset } = useDailyContestsState(initialView)
    const { data, isLoading, error } = useDailyContestsData(view, 20, offset)
    useShowcaseRefresh(true)
    return <div className="space-y-6">
        <div><h1 className="font-anton text-3xl">Daily contests</h1><p className="mt-2 text-sm text-muted-foreground">Free entry, nine-player lineups, and real baseball game days.</p></div>
        <ContestViewPicker value={view} onChange={setView} />
        <p className="text-xs text-muted-foreground">{view === 'history' ? 'Final results from completed contests, including lineups and scoring.' : 'Current contests follow the real baseball schedule. Lineups lock before first pitch.'}</p>
        <LoadState loading={isLoading} error={error && !data} empty={data?.items.length === 0}><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data?.items.map(contest => <DailyContestCard key={contest.id} contest={contest} view={view} />)}</div></LoadState>
        {!isLoading && !error && data?.items.length === 0 && view === 'current' && <p className="text-sm text-muted-foreground">No contests are currently available. Check back for upcoming games or <Link className="text-primary underline" href="/contests?view=history">explore contest history</Link>.</p>}
        {data && <PageNavigation offset={offset} total={data.total} onChange={setOffset} />}
    </div>
}
