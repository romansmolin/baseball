import Link from 'next/link'
import { ArrowRight, ArrowUpRight } from 'lucide-react'

import type { DailyContestSummary } from '@/shared/daily-contests'
import { buttonVariants } from '@/shared/ui/button'
import { dailyContestSeriesLabel, dailyContestSourceLabel } from '../model/contest-presentation'
import type { getFeaturedContestAction } from '../model/featured-contest'
import { number } from './showcase-primitives'

interface FeaturedContestProps {
    contest: DailyContestSummary
    action: ReturnType<typeof getFeaturedContestAction>
    hasEntry: boolean
}

export function FeaturedContest({ contest, action, hasEntry }: FeaturedContestProps) {
    return (
        <section className="pt-5 sm:pt-8" aria-labelledby="featured-contest-title">
            <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{dailyContestSourceLabel(contest)} · {dailyContestSeriesLabel(contest)} · {action.editable ? 'Free entry' : 'Lineups locked'}</p>
                <h1 id="featured-contest-title" className="mt-5 max-w-[14ch] font-anton text-[clamp(2.5rem,5vw,4.5rem)] uppercase leading-[1.08]">{!action.editable ? 'Lineups are locked.' : hasEntry ? 'Your lineup. Your next move.' : 'Your next lineup starts here.'}</h1>
                <p className="mt-5 break-words text-base font-medium sm:text-lg">{contest.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{action.editable ? 'Nine picks. One captain. Your shot at the top.' : 'Follow the contest and see how the lineups stack up.'}</p>
                <div className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-4">
                    <Link href={action.href} className={buttonVariants({ size: 'lg', className: 'h-12 gap-4 px-6 text-sm' })}>{action.label}<ArrowUpRight className="size-4" aria-hidden="true" /></Link>
                    <Link href="/contests" className="inline-flex items-center gap-2 text-sm font-medium hover:text-primary">All contests<ArrowRight className="size-4" aria-hidden="true" /></Link>
                </div>
                <p className="mt-6 text-xs text-muted-foreground">{number(contest.memberCount)} lineups entered</p>
            </div>
        </section>
    )
}

export function BetweenGameDays() {
    return (
        <section className="grid items-center gap-8 pt-5 sm:pt-8 lg:grid-cols-[minmax(0,1fr)_200px] lg:gap-8" aria-labelledby="between-games-title">
            <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Between game days</p>
                <h1 id="between-games-title" className="mt-5 max-w-[14ch] font-anton text-[clamp(2.5rem,5vw,4.5rem)] uppercase leading-[1.08]">The season has a story.</h1>
                <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">The next contest isn’t open yet. Explore completed contests and the managers who played them.</p>
                <div className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-4">
                    <Link href="/contests?view=history" className={buttonVariants({ size: 'lg', className: 'h-12 gap-4 px-6' })}>Explore season results<ArrowUpRight className="size-4" aria-hidden="true" /></Link>
                    <Link href="/teams" className="inline-flex items-center gap-2 text-sm font-medium hover:text-primary">My teams<ArrowRight className="size-4" aria-hidden="true" /></Link>
                </div>
            </div>
            <div className="border-l border-foreground/10 pl-6 lg:pl-8"><p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Season standings</p><p className="mt-2 text-base font-medium">Every point earned.</p><p className="mt-1 text-xs text-muted-foreground">From finalized baseball contests.</p></div>
        </section>
    )
}
