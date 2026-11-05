import Link from 'next/link'
import { ArrowDown, ArrowUp } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/shared/utils'
import type { RankMove } from '../model/manager-standing'
import { ManagerAvatar, number } from './showcase-primitives'

export function RankMoveLabel({ move }: { move: RankMove }) {
    if (!move) return <span className="text-muted-foreground/60" aria-label="No change">–</span>
    const Icon = move.direction === 'up' ? ArrowUp : ArrowDown
    return (
        <span className={cn('inline-flex items-center gap-0.5 tabular-nums', move.direction === 'up' ? 'text-emerald-600' : 'text-muted-foreground')} aria-label={`${move.direction === 'up' ? 'Up' : 'Down'} ${move.by}`}>
            <Icon className="size-3" aria-hidden="true" />{move.by}
        </span>
    )
}

interface CardStat { label: string; value: string }

interface ManagerCardProps {
    name: string
    image: string | null
    /** Line under the name: country, favourite club. */
    subtitle: ReactNode
    rank: number | null
    move?: RankMove
    stats: CardStat[]
    lead?: boolean
    className?: string
}

/** A manager as a baseball card: portrait panel, name banner, stat box on the bottom. */
export function ManagerCard({ name, image, subtitle, rank, move = null, stats, lead = false, className }: ManagerCardProps) {
    return (
        <div className={cn('flex h-full flex-col overflow-hidden rounded-lg border-[3px] bg-card p-2', lead ? 'border-board' : 'border-foreground/15', className)}>
            <div className={cn('relative flex aspect-[5/4] items-center justify-center rounded-md', lead ? 'bg-board' : 'bg-muted')}>
                {rank !== null && <span className={cn("absolute top-2 left-2.5 font-anton text-3xl leading-none", lead && "text-lamp")}>#{number(rank)}</span>}
                {move && <span className={cn("absolute top-2.5 right-2.5 text-sm font-medium", lead && "text-board-foreground")}><RankMoveLabel move={move} /></span>}
                <ManagerAvatar name={name} image={image} className="size-24 border-2 border-background bg-background text-2xl" />
            </div>
            <div className={cn('relative z-10 -mt-3 mx-2 rounded-sm px-2 py-1 text-center', lead ? 'bg-lamp text-board' : 'bg-foreground text-background')}>
                <p className="truncate font-anton text-lg uppercase leading-tight tracking-wide">{name}</p>
            </div>
            <p className="mt-2 min-h-5 truncate text-center text-sm text-muted-foreground">{subtitle}</p>
            <dl className="mt-auto grid grid-cols-3 gap-1 pt-3">
                {stats.map(stat => (
                    <div key={stat.label} className="rounded-md bg-muted/60 px-1 py-1.5 text-center">
                        <dd className="text-sm font-semibold tabular-nums">{stat.value}</dd>
                        <dt className="text-xs text-muted-foreground">{stat.label}</dt>
                    </div>
                ))}
            </dl>
        </div>
    )
}

export function ManagerCardLink({ userId, tilt, children }: { userId: string; tilt: string; children: ReactNode }) {
    return (
        <Link
            href={`/managers/${encodeURIComponent(userId)}`}
            className={cn('block h-full rounded-xl transition-transform duration-200 hover:rotate-0 hover:-translate-y-1 focus-visible:rotate-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:rotate-0 motion-reduce:transition-none', tilt)}
        >
            {children}
        </Link>
    )
}
