import Link from 'next/link'

import type { ManagerRow } from '@/shared/community'
import { cn } from '@/shared/utils'
import { ManagerAvatar, number } from './showcase-primitives'

interface LeadersPanelProps {
    top: ManagerRow[]
    me: ManagerRow | null
    loading: boolean
    failed: boolean
}

function LeaderRow({ manager, isMe }: { manager: ManagerRow; isMe: boolean }) {
    return (
        <li>
            <Link
                href={`/managers/${encodeURIComponent(manager.userId)}`}
                className={cn('flex items-center gap-3 border-t border-foreground/10 py-3 transition-colors hover:text-primary', isMe && 'bg-primary/[0.08] px-2')}
            >
                <span className="w-5 shrink-0 text-sm tabular-nums text-muted-foreground">{manager.rank}</span>
                <ManagerAvatar image={manager.image} name={manager.name} className="size-8" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{manager.name}{isMe && <span className="ml-1.5 font-normal text-muted-foreground">(you)</span>}</span>
                <span className="shrink-0 text-sm font-medium tabular-nums">{number(manager.points)} <span className="text-xs font-normal text-muted-foreground">pts</span></span>
            </Link>
        </li>
    )
}

export function LeadersPanel({ top, me, loading, failed }: LeadersPanelProps) {
    const meOutsideTop = me && !top.some(manager => manager.userId === me.userId)

    return (
        <section aria-labelledby="leaders-title">
            <div className="flex items-baseline justify-between gap-3 pb-2">
                <h2 id="leaders-title" className="text-base font-semibold">Season leaders</h2>
                <Link href="/managers?mode=LIVE" className="text-sm font-medium text-primary hover:underline">Full standings</Link>
            </div>
            {loading ? <div className="space-y-2" role="status" aria-label="Loading standings">{[0, 1, 2].map(i => <div key={i} className="h-10 animate-pulse rounded bg-muted" />)}</div>
                : failed ? <p role="alert" className="text-sm text-muted-foreground">We couldn’t load the standings.</p>
                : top.length === 0 ? <p className="text-sm text-muted-foreground">The standings fill in as contests finish.</p>
                : <ol>
                    {top.map(manager => <LeaderRow key={manager.userId} manager={manager} isMe={manager.userId === me?.userId} />)}
                    {meOutsideTop && <LeaderRow manager={me} isMe />}
                </ol>}
        </section>
    )
}
