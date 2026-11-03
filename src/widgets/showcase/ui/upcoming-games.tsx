'use client'

import Link from 'next/link'
import { ArrowRight, CalendarDays } from 'lucide-react'

import { useUpcomingGamesData } from '@/entities/dashboard'
import { useDailyContestData } from '@/entities/showcase'
import { selectUpcomingGames } from '../model/upcoming-games'

interface UpcomingGamesProps {
    contestId: string | null
    scheduleReady: boolean
    now: Date | null
}

export function UpcomingGames({ contestId, scheduleReady, now }: UpcomingGamesProps) {
    const contest = useDailyContestData(contestId)
    const mlb = useUpcomingGamesData(10, scheduleReady && !contestId)
    const source = contestId ? contest : mlb
    const games = contestId ? contest.data?.games : mlb.data?.map(game => ({
        gamePk: game.gamePk,
        gameDateUtc: game.gameDateUtc,
        status: game.status,
        awayTeamName: game.awayTeam.name,
        homeTeamName: game.homeTeam.name,
    }))
    const upcoming = selectUpcomingGames(games ?? [], now?.getTime() ?? Number.NaN)
    const loading = !scheduleReady || !now || (source.isLoading && !source.data)

    return (
        <aside aria-labelledby="upcoming-games-title" className="min-w-0 xl:border-l xl:border-foreground/10 xl:pl-8 xl:pt-8">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h2 id="upcoming-games-title" className="text-base font-semibold">Upcoming games</h2>
                    <p className="mt-1 text-xs text-muted-foreground">{!scheduleReady ? 'Upcoming schedule' : contestId ? 'In this contest' : 'MLB schedule'}</p>
                </div>
                <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </div>
            {loading ? <div className="space-y-4 py-6" role="status" aria-label="Loading upcoming games">{[0, 1, 2].map(i => <div key={i} className="h-9 animate-pulse rounded bg-muted" />)}</div>
                : source.error && !source.data ? <div className="py-6" role="alert"><p className="text-sm text-muted-foreground">Couldn’t load the schedule.</p><button type="button" className="mt-3 text-xs font-medium text-primary hover:underline" onClick={() => source.mutate()}>Try again →</button></div>
                : upcoming.length === 0 ? <p className="py-6 text-sm text-muted-foreground">{contestId ? 'No upcoming games in this contest.' : 'No upcoming MLB games in the next few days.'}</p>
                : <ul className="mt-3 divide-y divide-foreground/10">{upcoming.map(game => <li key={game.gamePk} className="py-3.5">
                    <p className="break-words text-sm font-medium">{game.awayTeamName} <span className="font-normal text-muted-foreground">at</span> {game.homeTeamName}</p>
                    <time dateTime={game.gameDateUtc} className="mt-1 block text-xs text-muted-foreground">{new Date(game.gameDateUtc).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · Local time</time>
                </li>)}</ul>}
            {source.error && source.data && <p className="mt-2 text-xs text-muted-foreground" role="status">Couldn’t refresh the schedule. Showing saved games.</p>}
            <Link href={contestId ? `/contests/${encodeURIComponent(contestId)}` : '/games'} className="mt-3 inline-flex items-center gap-2 text-xs font-medium hover:text-primary">{contestId ? 'View contest' : 'All MLB games'}<ArrowRight className="size-3.5" aria-hidden="true" /></Link>
        </aside>
    )
}
