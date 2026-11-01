'use client'
import Link from 'next/link'
import { useDailyContestsData, useShowcaseRefresh } from '@/entities/showcase'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Button, buttonVariants } from '@/shared/ui/button'
import { useShowcaseState } from '../model/use-showcase-state'
import { CommunityActivityPanel, CommunityLeaderboard, CommunityMetrics, ContestGameStrip } from './community-panels'
import { DailyContestCard } from './daily-contest-card'
import { LoadState, ModePicker } from './showcase-primitives'
export function ShowcaseOverview({ authenticated = true }: { authenticated?: boolean }) {
    const state = useShowcaseState()
    const contests = useDailyContestsData(state.mode, 6)
    useShowcaseRefresh(authenticated)
    return <section className="space-y-6" aria-label="Daily baseball community"><div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="font-anton text-3xl tracking-wide">Your next game day starts here</h1><p className="mt-2 text-sm text-muted-foreground">Build a lineup. Meet your rivals. Make every game count.</p></div><span className="rounded-full border border-primary/25 bg-primary/5 px-3 py-1.5 text-xs text-primary">Showcase · demo community</span></div><ModePicker value={state.mode} onChange={state.setMode} /><CommunityMetrics />{contests.data?.items[0] && <ContestGameStrip contestId={contests.data.items[0].id} />}<div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]"><Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle>{state.mode === 'REPLAY' ? 'Replay contests' : 'Daily contests'}</CardTitle><span className="text-xs text-primary">Free entry</span></div><p className="text-xs text-muted-foreground">{state.mode === 'REPLAY' ? 'Play historical baseball games with a separate leaderboard.' : 'Nine players. One lineup. Real baseball statistics.'}</p></CardHeader><CardContent><LoadState loading={contests.isLoading} error={contests.error && !contests.data} empty={contests.data?.items.length === 0}><div className="space-y-3">{contests.data?.items.map(contest => <DailyContestCard key={contest.id} contest={contest} />)}</div></LoadState>{!contests.isLoading && contests.data?.items.length === 0 && state.mode === 'LIVE' && <p className="mt-3 text-xs text-muted-foreground">No eligible current games are published. Explore Replay for historical contests. <Button className="mt-3" size="sm" variant="outline" onClick={() => state.setMode('REPLAY')}>Explore Replay</Button></p>}<Link href={`/contests?mode=${state.mode}`} className={buttonVariants({ variant: 'outline', size: 'sm', className: 'mt-4' })}>All daily contests</Link></CardContent></Card><div className="space-y-6"><CommunityLeaderboard mode={state.mode} period={state.period} onPeriodChange={state.setPeriod} /><CommunityActivityPanel /></div></div></section>
}
