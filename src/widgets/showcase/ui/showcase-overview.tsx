'use client'

import { useFeaturedDailyContestData, useDailyEntryData, useShowcaseRefresh } from '@/entities/showcase'
import { Button } from '@/shared/ui/button'
import { getFeaturedContestAction, selectFeaturedContest } from '../model/featured-contest'
import { useShowcaseClock } from '../model/use-showcase-state'
import { DashboardCorner, DashboardLeaders } from './dashboard-community'
import { BetweenGameDays, FeaturedContest } from './featured-contest'
import { timestamp } from './showcase-primitives'
import { TodayContestPanel } from './today-contest-panel'
import { UpcomingGames } from './upcoming-games'

export function ShowcaseOverview({ authenticated = true }: { authenticated?: boolean }) {
    const contests = useFeaturedDailyContestData()
    const now = useShowcaseClock()
    const featured = selectFeaturedContest(contests.data ? [contests.data] : [], now?.getTime() ?? Number.NaN)
    const entry = useDailyEntryData(authenticated ? featured?.id ?? null : null)
    const hasEntry = entry.data === undefined ? null : entry.data !== null
    const action = featured && now ? getFeaturedContestAction(featured, hasEntry, now.getTime()) : null
    const hasSchedule = contests.data !== undefined
    const loading = !now || (contests.isLoading && !hasSchedule)

    useShowcaseRefresh(authenticated)

    return (
        <section aria-label="Your daily baseball home">
            <div className="grid gap-10 border-b border-foreground/10 pb-10 sm:pb-14 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] xl:gap-10">
                <div className="min-w-0">
                    {loading ? <div className="space-y-5 py-12" role="status" aria-label="Loading your next contest">
                        <div className="h-4 w-48 animate-pulse rounded bg-muted" /><div className="h-20 w-full max-w-md animate-pulse rounded bg-muted" /><div className="h-10 w-48 animate-pulse rounded-full bg-muted" />
                    </div> : contests.error && !hasSchedule ? <div className="py-12" role="alert">
                        <h1 className="font-anton text-4xl uppercase">Let’s get you back to the game.</h1>
                        <p className="mt-4 text-sm text-muted-foreground">We couldn’t load the contest schedule. Please try again.</p>
                        <Button variant="outline" className="mt-6" onClick={() => contests.mutate()}>Retry schedule</Button>
                    </div> : featured && action ? <FeaturedContest contest={featured} action={action} hasEntry={hasEntry === true} /> : <BetweenGameDays />}
                    {contests.error && hasSchedule && <p className="mt-3 text-xs text-muted-foreground" role="status">Couldn’t refresh the schedule. Showing saved data{featured ? ` from ${timestamp(featured.updatedAt)}` : ''}.</p>}
                </div>
                <UpcomingGames contestId={featured?.id ?? null} scheduleReady={!loading} now={now} />
            </div>
            <div className="py-8 sm:py-10"><TodayContestPanel authenticated={authenticated} /></div>
            <div className="grid gap-10 pt-8 sm:pt-10 md:grid-cols-2 lg:gap-20"><DashboardCorner entry={entry.data} /><DashboardLeaders /></div>
        </section>
    )
}
