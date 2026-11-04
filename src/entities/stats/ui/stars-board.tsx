import Image from 'next/image'

import type { StatStar } from '@/shared/stats'
import { Button } from '@/shared/ui/button'
import { TeamLogo } from '@/shared/ui/team-logo'
import { cn } from '@/shared/utils'

interface StarsBoardProps {
    title: string
    subtitle: string | null
    stars: StatStar[]
    maxPoints: number
    loading: boolean
    failed: boolean
    onRetry: () => void
    /** "board" is the dark scoreboard; "paper" sits quietly on the page. */
    tone?: 'board' | 'paper'
}

const TONES = {
    board: {
        frame: 'rounded-md bg-board p-1.5 text-board-foreground',
        inner: 'rounded-[4px] border border-board-line',
        line: 'border-board-line',
        muted: 'text-board-foreground/60',
        rank: 'text-board-foreground/50',
        points: 'text-lamp',
        track: 'bg-board-line',
        fill: 'bg-lamp',
        photo: 'bg-black/25 ring-board-line text-board-foreground',
    },
    paper: {
        frame: 'rounded-lg border border-border bg-card',
        inner: '',
        line: 'border-border',
        muted: 'text-muted-foreground',
        rank: 'text-muted-foreground',
        points: 'text-foreground',
        track: 'bg-muted',
        fill: 'bg-board',
        photo: 'bg-muted ring-border text-foreground',
    },
} as const

const initials = (name: string) =>
    name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()

function Photo({ star, className }: { star: StatStar; className: string }) {
    return (
        <span className={cn('relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold ring-1', className)}>
            {initials(star.name)}
            {star.photoUrl && (
                <Image src={star.photoUrl} alt="" width={80} height={80} unoptimized className="absolute inset-0 size-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
            )}
        </span>
    )
}

export function StarsBoard({ title, subtitle, stars, maxPoints, loading, failed, onRetry, tone = 'board' }: StarsBoardProps) {
    const t = TONES[tone]

    return (
        <section aria-labelledby={`stars-title-${tone}`} className={t.frame}>
            <div className={t.inner}>
                <header className={cn('flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b px-5 py-4', t.line)}>
                    <h2 id={`stars-title-${tone}`} className="font-anton text-3xl uppercase leading-none">{title}</h2>
                    {subtitle && <p className={cn('min-w-0 truncate text-sm', t.muted)}>{subtitle}</p>}
                </header>
                {loading ? (
                    <div role="status" aria-label="Loading the stars" className="space-y-px">
                        {[0, 1, 2, 3, 4].map((i) => <div key={i} className="m-3 h-12 animate-pulse rounded-md bg-current/10" />)}
                    </div>
                ) : failed ? (
                    <div role="alert" className="px-5 py-6">
                        <p className="text-sm font-medium">We couldn’t load the stars.</p>
                        <p className={cn('mt-1 text-sm', t.muted)}>Check your connection and try again.</p>
                        <Button variant="outline" size="sm" className="mt-4 text-foreground" onClick={onRetry}>Try again</Button>
                    </div>
                ) : stars.length === 0 ? (
                    <p className={cn('px-5 py-6 text-sm', t.muted)}>Stars appear here after the first contest is scored from the official box scores.</p>
                ) : (
                    <ol>
                        {stars.map((star) => (
                            <li key={star.id} className={cn('grid grid-cols-[1.75rem_2.5rem_minmax(0,1fr)_auto] items-center gap-x-3 border-b px-5 py-3 last:border-b-0', t.line)}>
                                <span className={cn('font-anton text-xl tabular-nums', star.rank === 1 ? t.points : t.rank)}>{star.rank}</span>
                                <Photo star={star} className={t.photo} />
                                <div className="min-w-0">
                                    <p className="truncate font-semibold">{star.name}</p>
                                    <p className={cn('flex items-center gap-1.5 truncate text-sm', t.muted)}>
                                        <TeamLogo teamId={star.teamId} label={star.team} className="size-5 text-[7px]" />
                                        <span className="truncate">{star.position} · {star.team}</span>
                                    </p>
                                    <p className={cn('mt-0.5 text-sm font-medium tabular-nums', !star.statLine && t.muted)}>{star.statLine || 'Fielding and running'}</p>
                                </div>
                                <div className="text-right">
                                    <p className={cn('font-anton text-3xl leading-none tabular-nums', t.points)}>{star.fantasyPoints.toFixed(1)}</p>
                                    <div className={cn('mt-1.5 ml-auto h-1 w-16 rounded-full', t.track)}><div className={cn('h-full rounded-full', t.fill)} style={{ width: `${Math.round((star.fantasyPoints / maxPoints) * 100)}%` }} /></div>
                                </div>
                            </li>
                        ))}
                    </ol>
                )}
            </div>
        </section>
    )
}
