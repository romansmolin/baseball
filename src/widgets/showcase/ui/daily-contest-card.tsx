import Link from 'next/link'
import type { DailyContestSummary } from '@/shared/daily-contests'
import { buttonVariants } from '@/shared/ui/button'
import { cn } from '@/shared/utils'
import { date, number, timestamp } from './showcase-primitives'
export function DailyContestCard({ contest }: { contest: DailyContestSummary }) {
    return <article className="flex flex-col gap-3 rounded-xl border border-foreground/10 bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{contest.leagueSlug} · {contest.mode === 'REPLAY' ? 'Replay' : 'Current games'}</span><span className={cn('rounded-full px-2 py-1 text-[11px]', contest.status === 'OPEN' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>{contest.status === 'OPEN' ? 'Open for entries' : contest.status === 'LOCKED' ? 'Lineups locked' : contest.status === 'COMPLETED' ? 'Final results' : 'Cancelled'}</span></div>
        <Link href={`/contests/${encodeURIComponent(contest.id)}`} className="font-anton text-xl tracking-wide hover:text-primary">{contest.name}</Link>
        <div className="text-xs text-muted-foreground">{contest.mode === 'REPLAY' ? `Historical games · ${date(contest.sourceDate)}` : date(contest.contestDate)}</div>
        <div className="text-xs text-muted-foreground">{contest.status === 'OPEN' ? 'Lineups lock' : 'Lineup deadline'} · {timestamp(contest.locksAt)}</div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-foreground/10 pt-3"><span className="text-xs text-muted-foreground">{number(contest.memberCount)} entries · 9 players</span><Link href={`/contests/${encodeURIComponent(contest.id)}`} className={buttonVariants({ size: 'sm', variant: contest.status === 'OPEN' ? 'default' : 'outline' })}>{contest.status === 'OPEN' ? 'Build a lineup · Free' : 'View results'}</Link></div>
    </article>
}
