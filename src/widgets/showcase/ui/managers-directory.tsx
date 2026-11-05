'use client'

import Link from 'next/link'

import type { ManagerPeriod, ManagerRow } from '@/shared/community'
import type { DailyContestMode } from '@/shared/daily-contests'
import { Button } from '@/shared/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { cn } from '@/shared/utils'
import { averagePoints, countryLabel, podiumOrder, rankMove } from '../model/manager-standing'
import { MANAGERS_PAGE_SIZE, useManagersDirectory } from '../model/use-managers-directory'
import { ManagerCard, ManagerCardLink, RankMoveLabel } from './manager-card'
import { ManagerAvatar, number } from './showcase-primitives'

const PERIODS: { value: ManagerPeriod; label: string; ranked: string; empty: string }[] = [
    { value: 'season', label: 'This season', ranked: 'this season', empty: 'No contest has finished this season yet.' },
    { value: 'week', label: 'This week', ranked: 'this week', empty: 'No contest has finished this week yet. Check this season’s standings.' },
    { value: 'day', label: 'Today', ranked: 'today', empty: 'No contest has finished today yet. Check this week’s standings.' },
]

const SOURCES: { value: DailyContestMode; label: string }[] = [
    { value: 'LIVE', label: 'Current games' },
    { value: 'REPLAY', label: 'Past seasons' },
]

const TILT: Record<number, string> = { 1: '', 2: 'sm:-rotate-2', 3: 'sm:rotate-2' }
const PLACE_ORDER: Record<number, string> = { 1: 'order-1 sm:order-2', 2: 'order-2 sm:order-1 sm:mt-8', 3: 'order-3 sm:mt-8' }

function Podium({ managers }: { managers: ManagerRow[] }) {
    return (
        <ol className="mx-auto grid max-w-3xl gap-5 sm:grid-cols-3 sm:gap-6">
            {podiumOrder(managers).map(({ item, place }) => (
                <li key={item.userId} className={cn('mx-auto w-full max-w-64 sm:max-w-none', PLACE_ORDER[place])}>
                    <ManagerCardLink userId={item.userId} tilt={TILT[place]}>
                        <ManagerCard
                            name={item.name}
                            image={item.image}
                            subtitle={countryLabel(item.countryCode)}
                            rank={item.rank}
                            move={rankMove(item)}
                            lead={place === 1}
                            stats={[
                                { label: 'Points', value: number(item.points) },
                                { label: 'Contests', value: number(item.entries) },
                                { label: 'Average', value: number(averagePoints(item)) },
                            ]}
                        />
                    </ManagerCardLink>
                </li>
            ))}
        </ol>
    )
}

const ROW_COLUMNS = 'grid grid-cols-[2.5rem_2.25rem_minmax(0,1fr)_4.5rem] items-center gap-x-3 sm:grid-cols-[2.5rem_2.5rem_minmax(0,1fr)_5rem_5rem_6rem]'

function StandingRow({ manager, leaderPoints }: { manager: ManagerRow; leaderPoints: number }) {
    const share = leaderPoints > 0 ? Math.min(100, manager.points / leaderPoints * 100) : 0

    return (
        <li>
            <Link
                href={`/managers/${encodeURIComponent(manager.userId)}`}
                className={cn(ROW_COLUMNS, 'relative border-t border-foreground/10 py-3 text-sm transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring')}
            >
                <span className="pl-1 font-anton text-lg tabular-nums">{number(manager.rank ?? 0)}</span>
                <span className="text-xs"><RankMoveLabel move={rankMove(manager)} /></span>
                <span className="flex min-w-0 items-center gap-3">
                    <ManagerAvatar image={manager.image} name={manager.name} className="size-9" />
                    <span className="min-w-0">
                        <span className="block truncate font-medium">{manager.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{countryLabel(manager.countryCode)}</span>
                    </span>
                </span>
                <span className="hidden text-right tabular-nums text-muted-foreground sm:block">{number(manager.entries)}</span>
                <span className="hidden text-right tabular-nums text-muted-foreground sm:block">{number(averagePoints(manager))}</span>
                <span className="pr-1 text-right font-semibold tabular-nums">{number(manager.points)}</span>
                <span aria-hidden="true" className="absolute bottom-0 left-0 h-0.5 bg-primary/40" style={{ width: `${share}%` }} />
            </Link>
        </li>
    )
}

export function ManagersDirectory({ initialMode = 'LIVE' }: { initialMode?: DailyContestMode }) {
    const state = useManagersDirectory(initialMode)
    const period = PERIODS.find(item => item.value === state.period) ?? PERIODS[0]
    const lastShown = Math.min(state.offset + MANAGERS_PAGE_SIZE, state.total)

    return (
        <div>
            <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
                <h1 className="font-anton text-4xl uppercase leading-none sm:text-5xl">Managers</h1>
                {state.total > 0 && <p className="text-sm text-muted-foreground">{number(state.total)} ranked {period.ranked}</p>}
            </header>
            <p className="mt-3 max-w-prose text-sm text-muted-foreground">Everyone who finished a contest, ranked by points from real box scores.</p>

            <Tabs value={state.period} onValueChange={value => state.setPeriod(value as ManagerPeriod)} className="mt-8">
                <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-foreground/10 pb-3">
                    <TabsList variant="line">
                        {PERIODS.map(item => <TabsTrigger key={item.value} value={item.value}>{item.label}</TabsTrigger>)}
                    </TabsList>
                    <Select items={SOURCES} value={state.mode} onValueChange={value => state.setMode(value as DailyContestMode)}>
                        <SelectTrigger aria-label="Which contests count" className="w-44"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {SOURCES.map(source => <SelectItem key={source.value} value={source.value}>{source.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <TabsContent value={state.period} className="pt-8">
                    {state.loading ? (
                        <div className="space-y-6" role="status" aria-label="Loading standings">
                            <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-3">{[0, 1, 2].map(i => <div key={i} className="aspect-[5/7] animate-pulse rounded-xl bg-muted" />)}</div>
                            {[0, 1, 2].map(i => <div key={i} className="h-14 animate-pulse rounded bg-muted" />)}
                        </div>
                    ) : state.failed ? (
                        <div role="alert">
                            <p className="text-sm text-muted-foreground">We couldn’t load the standings. Check your connection and try again.</p>
                            <Button variant="outline" className="mt-4" onClick={state.retry}>Try again</Button>
                        </div>
                    ) : state.isEmpty ? (
                        <p className="text-sm text-muted-foreground">{period.empty}</p>
                    ) : (
                        <>
                            {state.podium.length > 0 && <Podium managers={state.podium} />}
                            {state.rows.length > 0 && (
                                <div className={cn(state.podium.length > 0 && 'mt-12')}>
                                    <div className={cn(ROW_COLUMNS, 'pb-2 text-xs text-muted-foreground')}>
                                        <span className="pl-1">Rank</span>
                                        <span>Move</span>
                                        <span>Manager</span>
                                        <span className="hidden text-right sm:block">Contests</span>
                                        <span className="hidden text-right sm:block">Average</span>
                                        <span className="pr-1 text-right">Points</span>
                                    </div>
                                    <ol>{state.rows.map(manager => <StandingRow key={manager.userId} manager={manager} leaderPoints={state.leaderPoints ?? state.rows[0].points} />)}</ol>
                                </div>
                            )}
                            <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-foreground/10 pt-4">
                                <p className="text-sm text-muted-foreground">{number(state.offset + 1)}–{number(lastShown)} of {number(state.total)}</p>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" disabled={state.offset === 0} onClick={() => state.setOffset(Math.max(0, state.offset - MANAGERS_PAGE_SIZE))}>Previous</Button>
                                    <Button variant="outline" size="sm" disabled={lastShown >= state.total} onClick={() => state.setOffset(state.offset + MANAGERS_PAGE_SIZE)}>Next</Button>
                                </div>
                            </div>
                        </>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
