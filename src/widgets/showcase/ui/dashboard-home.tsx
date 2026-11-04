'use client'

import type { ReactNode } from 'react'

import { useDashboardHome } from '../model/use-dashboard-home'
import { LeadersPanel } from './leaders-panel'
import { NextMove } from './next-move'
import { SeasonSummary } from './season-summary'
import { TodayLedger } from './today-contest-panel'
import { UpcomingGames } from './upcoming-games'
import { YesterdaysStars } from './yesterdays-stars'

interface DashboardHomeProps {
    userId: string
    firstName: string
    /** Shown above the season summary, e.g. the getting-started checklist. */
    sidebarTop?: ReactNode
}

export function DashboardHome({ userId, firstName, sidebarTop }: DashboardHomeProps) {
    const { today, season } = useDashboardHome(userId)
    const nextDailyId = today.next?.kind === 'DAILY' ? today.next.id : null
    const dateLabel = today.now?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

    return (
        <div className="mx-auto w-full max-w-[1280px] px-5 py-6 sm:px-8 lg:py-10">
            <header className="mb-8 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <h1 className="text-2xl font-semibold">{today.hasEntries ? 'Welcome back' : 'Welcome'}, {firstName}</h1>
                {dateLabel && <p className="text-sm text-muted-foreground">{dateLabel}</p>}
            </header>
            <div className="grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_340px]">
                <div className="min-w-0 space-y-10">
                    <NextMove
                        next={today.next}
                        entered={!!today.next && today.enteredIds.has(today.next.id)}
                        now={today.now}
                        hasEntries={today.hasEntries}
                        loading={today.loading}
                        failed={today.failed}
                        onRetry={today.retry}
                    />
                    <YesterdaysStars />
                    <TodayLedger state={today} />
                </div>
                <aside className="min-w-0 space-y-10 lg:border-l lg:border-foreground/10 lg:pl-10">
                    {sidebarTop}
                    <SeasonSummary me={season.me} leader={season.leader} total={season.total} loading={season.loading} failed={season.failed} />
                    <LeadersPanel top={season.top} me={season.me} loading={season.loading} failed={season.failed} />
                    <UpcomingGames contestId={nextDailyId} scheduleReady={!today.loading} now={today.now} />
                </aside>
            </div>
        </div>
    )
}
