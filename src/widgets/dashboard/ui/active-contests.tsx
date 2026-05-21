import { ArrowRight01Icon, Clock01Icon, LiveStreaming01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { cn } from '@/shared/utils'

import { activeContests } from '../model/mock-data'
import type { ActiveContest } from '../model/dashboard.type'

export const ActiveContests = () => (
    <Card className="h-full">
        <CardHeader>
            <CardTitle className="text-base">Active contests</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
            {activeContests.map((contest) => (
                <ActiveContestRow key={contest.id} contest={contest} />
            ))}
        </CardContent>
    </Card>
)

const ActiveContestRow = ({ contest }: { contest: ActiveContest }) => {
    const isLive = contest.status === 'live'
    const isUpcoming = contest.status === 'upcoming'
    const beatingLeader =
        contest.currentScore != null &&
        contest.leaderScore != null &&
        contest.currentScore >= contest.leaderScore

    return (
        <div
            className={cn(
                'flex flex-col gap-2 rounded-lg border p-4 md:flex-row md:items-center md:justify-between',
                isLive && 'border-primary/30 bg-primary/5',
                isUpcoming && 'border-foreground/10 bg-muted/30',
            )}
        >
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-xs">
                    {isLive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-primary">
                            <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                            <HugeiconsIcon icon={LiveStreaming01Icon} className="size-3" />
                            Live
                        </span>
                    ) : (
                        <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-muted-foreground">
                            Upcoming
                        </span>
                    )}
                    <span className="text-muted-foreground">{contest.type}</span>
                </div>
                <div className="font-medium">{contest.name}</div>
                {isLive && contest.rank != null && contest.totalEntries != null && (
                    <div className="text-xs text-muted-foreground">
                        Rank{' '}
                        <span className="text-foreground">
                            #{contest.rank} / {contest.totalEntries.toLocaleString()}
                        </span>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-4">
                {isLive && contest.currentScore != null && (
                    <div className="text-right">
                        <div className="text-xs text-muted-foreground">Your score</div>
                        <div
                            className={cn(
                                'font-anton text-2xl tracking-wide',
                                beatingLeader ? 'text-primary' : 'text-foreground',
                            )}
                        >
                            {contest.currentScore.toFixed(1)}
                        </div>
                        {contest.leaderScore != null && (
                            <div className="text-xs text-muted-foreground">
                                Leader {contest.leaderScore.toFixed(1)}
                            </div>
                        )}
                    </div>
                )}
                <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <HugeiconsIcon icon={Clock01Icon} className="size-3.5" />
                        {contest.timeRemainingLabel}
                    </div>
                    {contest.needsLineup ? (
                        <Button size="sm" className="gap-1">
                            Set lineup
                            <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" />
                        </Button>
                    ) : (
                        <Button variant="outline" size="sm" className="gap-1">
                            View
                            <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
