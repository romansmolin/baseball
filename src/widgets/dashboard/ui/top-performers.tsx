'use client'

import { StarIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { useTopPerformersData } from '@/entities/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

export const TopPerformers = () => {
    const { data, error, isLoading } = useTopPerformersData()
    const performers = data ?? []

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="text-base">Top performers</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col">
                {error ? (
                    <div className="text-sm text-muted-foreground">
                        Couldn&apos;t load top performers.
                    </div>
                ) : isLoading ? (
                    [0, 1, 2, 3, 4].map((i) => <TopPerformerSkeleton key={i} />)
                ) : (
                    performers.map((player) => (
                        <div
                            key={player.id}
                            className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/40"
                        >
                            <span className="flex size-7 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                                {player.rank}
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium">{player.name}</div>
                                <div className="text-xs text-muted-foreground">
                                    {player.position} · {player.team}
                                </div>
                            </div>
                            <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
                                <HugeiconsIcon icon={StarIcon} className="size-3.5 text-primary" />
                                {player.fantasyPoints.toFixed(1)}
                            </div>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    )
}

const TopPerformerSkeleton = () => (
    <div className="flex items-center gap-3 px-2 py-2">
        <div className="size-7 animate-pulse rounded-full bg-muted" />
        <div className="flex-1 space-y-1">
            <div className="h-3 w-32 animate-pulse rounded bg-muted" />
            <div className="h-2.5 w-16 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-3 w-10 animate-pulse rounded bg-muted" />
    </div>
)
