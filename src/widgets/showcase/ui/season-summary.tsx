import type { ManagerRow } from '@/shared/community'
import { gapToLeader } from '../model/dashboard-home'
import { number } from './showcase-primitives'

interface SeasonSummaryProps {
    me: ManagerRow | null
    leader: ManagerRow | null
    total: number
    loading: boolean
    failed: boolean
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
    return (
        <div>
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="mt-1 font-anton text-3xl leading-none">{value}</dd>
            {hint && <dd className="mt-1 text-xs text-muted-foreground">{hint}</dd>}
        </div>
    )
}

export function SeasonSummary({ me, leader, total, loading, failed }: SeasonSummaryProps) {
    return (
        <section aria-labelledby="season-title">
            <h2 id="season-title" className="text-base font-semibold">Your season</h2>
            {loading ? <div className="mt-4 h-16 animate-pulse rounded bg-muted" role="status" aria-label="Loading your season" />
                : failed ? <p role="alert" className="mt-3 text-sm text-muted-foreground">We couldn’t load the standings.</p>
                : me && me.rank !== null ? (
                    <>
                        <dl className="mt-4 grid grid-cols-3 gap-4">
                            <Stat label="Rank" value={`#${me.rank}`} hint={total > 0 ? `of ${number(total)}` : undefined} />
                            <Stat label="Points" value={number(me.points)} />
                            <Stat label="Contests" value={number(me.entries)} />
                        </dl>
                        {leader && <p className="mt-4 text-sm text-muted-foreground">{gapToLeader(me.points, leader.points, leader.name, leader.userId === me.userId)}</p>}
                    </>
                ) : (
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">You’re not in the standings yet. Finish a contest and your rank and points show up here.</p>
                )}
        </section>
    )
}
