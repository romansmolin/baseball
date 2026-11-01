'use client'
import type { DailyContestMode } from '@/shared/daily-contests'
import { useDailyContestsData, useShowcaseRefresh } from '@/entities/showcase'
import { useShowcaseState } from '../model/use-showcase-state'
import { DailyContestCard } from './daily-contest-card'
import { LoadState, ModePicker, PageNavigation } from './showcase-primitives'
export function DailyContestsCatalog({ initialMode = 'LIVE' }: { initialMode?: DailyContestMode }) {
    const state = useShowcaseState(initialMode)
    const { data, isLoading, error } = useDailyContestsData(state.mode, 20, state.offset)
    useShowcaseRefresh(true)
    return <div className="space-y-6"><div><h1 className="font-anton text-3xl">Daily contests</h1><p className="mt-2 text-sm text-muted-foreground">Free entry, nine-player lineups, and a new challenge every game day.</p></div><ModePicker value={state.mode} onChange={state.setMode} /><p className="text-xs text-muted-foreground">{state.mode === 'REPLAY' ? 'Replay uses historical games. Source dates are displayed on every contest. Replay has its own rankings.' : 'Current contests follow the real baseball schedule. Demo managers are labelled throughout the community.'}</p><LoadState loading={isLoading} error={error && !data} empty={data?.items.length === 0}><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data?.items.map(contest => <DailyContestCard key={contest.id} contest={contest} />)}</div></LoadState>{data && <PageNavigation offset={state.offset} total={data.total} onChange={state.setOffset} />}</div>
}
