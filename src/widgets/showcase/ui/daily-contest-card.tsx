import Link from 'next/link'
import type { DailyContestSummary, DailyContestView } from '@/shared/daily-contests'
import { buttonVariants } from '@/shared/ui/button'
import { cn } from '@/shared/utils'
import { date, number, timestamp } from './showcase-primitives'
import { dailyContestSeriesLabel, dailyContestSourceLabel, dailyContestViewLabel } from '../model/contest-presentation'
export function DailyContestCard({ contest, view = contest.status === 'COMPLETED' ? 'history' : 'current' }: { contest: DailyContestSummary; view?: DailyContestView }) {
    const href = `/contests/${encodeURIComponent(contest.id)}?view=${view}`
    return <article className="flex flex-col gap-3 rounded-xl border border-foreground/10 bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{dailyContestSeriesLabel(contest)} · {dailyContestSourceLabel(contest)} · {dailyContestViewLabel(contest)}</span><span className={cn('rounded-full px-2 py-1 text-[11px]', contest.status === 'OPEN' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>{contest.status === 'OPEN' ? 'Open for entries' : contest.status === 'LOCKED' ? 'Lineups locked' : contest.status === 'COMPLETED' ? 'Final results' : 'Cancelled'}</span></div>
        <Link href={href} className="font-anton text-xl tracking-wide hover:text-primary">{contest.name}</Link>
        <div className="text-xs text-muted-foreground">{date(contest.contestDate)}{contest.mode === 'REPLAY' && contest.sourceDate !== contest.contestDate ? ` · Source games ${date(contest.sourceDate)}` : ''}</div>
        <div className="text-xs text-muted-foreground">{contest.status === 'OPEN' ? 'Lineups lock' : 'Lineup deadline'} · {timestamp(contest.locksAt)}</div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-foreground/10 pt-3"><span className="text-xs text-muted-foreground">{number(contest.memberCount)} entries · 9 players</span><Link href={href} className={buttonVariants({ size: 'sm', variant: contest.status === 'OPEN' ? 'default' : 'outline' })}>{contest.status === 'OPEN' ? 'Build a lineup · Free' : 'View results'}</Link></div>
    </article>
}
