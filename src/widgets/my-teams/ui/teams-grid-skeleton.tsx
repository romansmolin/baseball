'use client'

import { cn } from '@/shared/utils'

import type { ViewMode } from '../model/team.type'

interface TeamsGridSkeletonProps {
    view: ViewMode
    count?: number
}

export const TeamsGridSkeleton = ({ view, count = 6 }: TeamsGridSkeletonProps) => (
    <div
        className={cn(
            view === 'list' ? 'grid grid-cols-1 gap-2.5' : 'grid grid-cols-1 gap-3 sm:grid-cols-2',
        )}
    >
        {Array.from({ length: count }, (_, i) => (
            <div
                key={i}
                className="rounded-xl border border-foreground/10 bg-muted/30 p-4"
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="size-2 animate-pulse rounded-full bg-muted" />
                        <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                    </div>
                    <div className="size-6 animate-pulse rounded bg-muted" />
                </div>
                <div className="mt-3 h-5 w-40 animate-pulse rounded bg-muted" />
                <div className="mt-2 h-3 w-24 animate-pulse rounded bg-muted" />
                <div className="mt-4 flex items-center justify-between">
                    <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                    <div className="h-7 w-16 animate-pulse rounded bg-muted" />
                </div>
            </div>
        ))}
    </div>
)
