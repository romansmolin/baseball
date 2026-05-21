import { StarIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

import { topPerformers } from '../model/mock-data'

export const TopPerformers = () => (
    <Card className="h-full">
        <CardHeader>
            <CardTitle className="text-base">Top performers</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col">
            {topPerformers.map((player) => (
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
            ))}
        </CardContent>
    </Card>
)
