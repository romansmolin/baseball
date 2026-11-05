'use client'

import { Search, X } from 'lucide-react'

import type { ContestCatalogView } from '@/shared/tournaments'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { groupTicketsByMonth, type ContestTab } from '../model/contest-ticket'
import { CONTESTS_PAGE_SIZE, useContestsCatalog, type ContestKindFilter } from '../model/use-contests-catalog'
import { ContestTicket } from './contest-ticket'

const TABS: { value: ContestTab; label: string; empty: string }[] = [
    { value: 'open', label: 'Open', empty: 'No contest is taking entries right now. New ones open as games are added to the schedule.' },
    { value: 'live', label: 'In play', empty: 'No contest is being played right now.' },
    { value: 'results', label: 'Results', empty: 'Finished contests appear here with their standings.' },
]

const FORMATS: { value: ContestKindFilter; label: string }[] = [
    { value: 'ALL', label: 'All formats' },
    { value: 'DAILY', label: 'Daily and weekend' },
    { value: 'SERIES', label: 'Series' },
    { value: 'LEAGUE', label: 'League tournaments' },
]

export function ContestsCatalog({ initialView = 'current' }: { initialView?: ContestCatalogView }) {
    const state = useContestsCatalog(initialView === 'history' ? 'results' : 'open')
    const activeTab = TABS.find(tab => tab.value === state.tab) ?? TABS[0]
    const groups = groupTicketsByMonth(state.items, state.tab)
    const lastShown = Math.min(state.offset + CONTESTS_PAGE_SIZE, state.total)

    return (
        <div className="mx-auto w-full max-w-[1280px] px-5 py-6 sm:px-8 lg:py-10">
            <header>
                <h1 className="font-anton text-4xl uppercase leading-none sm:text-5xl">Contests</h1>
                <p className="mt-3 max-w-prose text-sm text-muted-foreground">Pick a contest, build one lineup for it, and score from real games. Each contest has its own lineup.</p>
            </header>

            <Tabs value={state.tab} onValueChange={value => state.changeTab(value as ContestTab)} className="mt-8">
                <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-foreground/10 pb-3">
                    <TabsList variant="line">
                        {TABS.map(tab => (
                            <TabsTrigger key={tab.value} value={tab.value}>
                                {tab.label}
                                {state.counts[tab.value] !== undefined && <span className="tabular-nums text-muted-foreground">{state.counts[tab.value]?.toLocaleString('en-US')}</span>}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                        <Select items={FORMATS} value={state.kind} onValueChange={value => state.changeKind(value as ContestKindFilter)}>
                            <SelectTrigger aria-label="Contest format" className="w-full sm:w-48"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {FORMATS.map(format => <SelectItem key={format.value} value={format.value}>{format.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <form role="search" className="relative w-full sm:w-auto" onSubmit={event => { event.preventDefault(); state.submitSearch() }}>
                            <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input aria-label="Search contests" className="w-full pr-8 pl-9 sm:w-56" placeholder="Search by name" value={state.searchText} onChange={event => state.setSearchText(event.target.value)} />
                            {state.searchText && (
                                <button type="button" aria-label="Clear search" className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={state.clearSearch}>
                                    <X className="size-4" aria-hidden="true" />
                                </button>
                            )}
                        </form>
                    </div>
                </div>

                <TabsContent value={state.tab} className="pt-6">
                    {state.loading ? (
                        <div className="grid gap-4 xl:grid-cols-2" role="status" aria-label="Loading contests">{[0, 1, 2, 3].map(i => <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted" />)}</div>
                    ) : state.failed ? (
                        <div role="alert" className="py-6">
                            <p className="text-sm text-muted-foreground">We couldn’t load contests. Check your connection and try again.</p>
                            <Button variant="outline" className="mt-4" onClick={state.retry}>Try again</Button>
                        </div>
                    ) : state.items.length === 0 ? (
                        <div className="py-6">
                            <p className="text-sm text-muted-foreground">{state.search ? `No contests match “${state.search}”.` : activeTab.empty}</p>
                            {state.search && <Button variant="outline" className="mt-4" onClick={state.clearSearch}>Clear search</Button>}
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {groups.map(group => (
                                <section key={group.month} aria-label={group.month}>
                                    <h2 className="pb-3 text-lg font-semibold">{group.month}</h2>
                                    <ul className="grid gap-4 xl:grid-cols-2">
                                        {group.items.map(item => <li key={`${item.kind}:${item.id}`}><ContestTicket item={item} tab={state.tab} /></li>)}
                                    </ul>
                                </section>
                            ))}
                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-foreground/10 pt-4">
                                <p className="text-sm text-muted-foreground">{(state.offset + 1).toLocaleString('en-US')}–{lastShown.toLocaleString('en-US')} of {state.total.toLocaleString('en-US')}</p>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" disabled={state.offset === 0} onClick={() => state.setOffset(Math.max(0, state.offset - CONTESTS_PAGE_SIZE))}>Previous</Button>
                                    <Button variant="outline" size="sm" disabled={lastShown >= state.total} onClick={() => state.setOffset(state.offset + CONTESTS_PAGE_SIZE)}>Next</Button>
                                </div>
                            </div>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
