import { ArrowUpRight01Icon, Clock01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

import { featuredContests } from '../model/mock-data'
import type { FeaturedContest } from '../model/dashboard.type'

export const FeaturedContests = () => (
    <Card>
        <CardHeader>
            <CardTitle className="text-base">Today&apos;s featured contests</CardTitle>
            <div className="col-start-2 row-span-2 row-start-1 self-start justify-self-end">
                <Button variant="outline" size="sm" className="gap-1">
                    View all
                    <HugeiconsIcon icon={ArrowUpRight01Icon} className="size-3.5" />
                </Button>
            </div>
        </CardHeader>
        <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
                {featuredContests.map((contest) => (
                    <FeaturedContestCard key={contest.id} contest={contest} />
                ))}
            </div>
        </CardContent>
    </Card>
)

const FeaturedContestCard = ({ contest }: { contest: FeaturedContest }) => (
    <div className="flex flex-col gap-2 rounded-lg bg-muted/40 p-4">
        <div className="text-xs text-muted-foreground">
            {contest.type} · {contest.format}
        </div>
        <div className="font-medium">{contest.name}</div>
        <div className="flex items-baseline justify-between">
            <span className="text-primary font-semibold">{contest.prizeCredits} cr prize</span>
            <span className="text-xs text-muted-foreground">
                {contest.entryFeeCredits === 0
                    ? 'Free entry'
                    : `${contest.entryFeeCredits} cr entry`}
            </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <HugeiconsIcon icon={Clock01Icon} className="size-3.5" />
            {contest.lockInLabel}
        </div>
    </div>
)
