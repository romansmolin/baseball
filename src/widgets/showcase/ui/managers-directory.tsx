'use client'
import type { DailyContestMode } from '@/shared/daily-contests'
import { useManagersData } from '@/entities/showcase'
import { Card, CardContent } from '@/shared/ui/card'
import { useShowcaseState } from '../model/use-showcase-state'
import { ManagerRows } from './community-panels'
import { LoadState, ModePicker, PageNavigation, PeriodPicker } from './showcase-primitives'
export function ManagersDirectory({ initialMode = 'LIVE' }: { initialMode?: DailyContestMode }) {
    const state = useShowcaseState(initialMode)
    const { data, isLoading, error } = useManagersData({ mode: state.mode, period: state.period, offset: state.offset, limit: 20 })
    return <div className="space-y-6"><div><h1 className="font-anton text-3xl">Meet the managers</h1><p className="mt-2 text-sm text-muted-foreground">Follow the standings and explore your rivals’ contest history.</p></div><div className="flex flex-wrap items-center justify-between gap-3"><ModePicker value={state.mode} onChange={state.setMode} /><PeriodPicker value={state.period} onChange={state.setPeriod} /></div><p className="text-xs text-muted-foreground">Points come from finalized contests. A dash means a manager has no finalized result for this period.</p><Card><CardContent><LoadState loading={isLoading} error={error && !data} empty={data?.items.length === 0}>{data && <ManagerRows items={data.items} />}</LoadState>{data && <PageNavigation offset={state.offset} total={data.total} onChange={state.setOffset} />}</CardContent></Card></div>
}
