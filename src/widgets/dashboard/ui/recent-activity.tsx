import {
    Coins01Icon,
    GameController01Icon,
    MagicWand01Icon,
    SparklesIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

import { recentActivity } from '../model/mock-data'
import type { ActivityKind } from '../model/dashboard.type'

const iconForKind: Record<ActivityKind, typeof Coins01Icon> = {
    contest_entered: GameController01Icon,
    credits_earned: Coins01Icon,
    lineup_locked: SparklesIcon,
    ai_used: MagicWand01Icon,
}

export const RecentActivity = () => (
    <Card>
        <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
            <ul className="flex flex-col">
                {recentActivity.map((event) => (
                    <li
                        key={event.id}
                        className="flex items-center gap-3 border-b border-foreground/5 py-3 last:border-b-0"
                    >
                        <span className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary">
                            <HugeiconsIcon icon={iconForKind[event.kind]} className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{event.label}</div>
                            <div className="text-xs text-muted-foreground">{event.detail}</div>
                        </div>
                        <span className="text-xs text-muted-foreground">{event.timestamp}</span>
                    </li>
                ))}
            </ul>
        </CardContent>
    </Card>
)
