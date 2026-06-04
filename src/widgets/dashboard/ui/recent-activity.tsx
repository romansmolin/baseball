'use client'

import {
    Coins01Icon,
    MagicWand01Icon,
    SparklesIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { useActivityData } from '@/entities/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import type { ActivityKind } from '@/shared/dashboard'

const iconForKind: Record<ActivityKind, typeof Coins01Icon> = {
    credits_earned: Coins01Icon,
    lineup_locked: SparklesIcon,
    ai_used: MagicWand01Icon,
}

export const RecentActivity = () => {
    const { data, error, isLoading } = useActivityData()
    const events = data ?? []

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Recent activity</CardTitle>
            </CardHeader>
            <CardContent>
                {error ? (
                    <div className="text-sm text-muted-foreground">
                        Couldn&apos;t load recent activity.
                    </div>
                ) : isLoading ? (
                    <ul className="flex flex-col">
                        {[0, 1, 2, 3].map((i) => (
                            <li
                                key={i}
                                className="flex items-center gap-3 border-b border-foreground/5 py-3 last:border-b-0"
                            >
                                <div className="size-9 animate-pulse rounded-full bg-muted" />
                                <div className="flex-1 space-y-1">
                                    <div className="h-3 w-40 animate-pulse rounded bg-muted" />
                                    <div className="h-2.5 w-24 animate-pulse rounded bg-muted" />
                                </div>
                                <div className="h-3 w-12 animate-pulse rounded bg-muted" />
                            </li>
                        ))}
                    </ul>
                ) : events.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No recent activity.</div>
                ) : (
                    <ul className="flex flex-col">
                        {events.map((event) => (
                            <li
                                key={event.id}
                                className="flex items-center gap-3 border-b border-foreground/5 py-3 last:border-b-0"
                            >
                                <span className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary">
                                    <HugeiconsIcon
                                        icon={iconForKind[event.kind]}
                                        className="size-4"
                                    />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-medium">
                                        {event.label}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {event.detail}
                                    </div>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                    {event.timestamp}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    )
}
