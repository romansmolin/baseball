'use client'

import {
    Coins01Icon,
    GiftIcon,
    ShoppingBagIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { useCreditsData } from '@/entities/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { cn } from '@/shared/utils'

const ICON_BY_KIND = {
    signup_bonus: GiftIcon,
    reward: GiftIcon,
    purchase: ShoppingBagIcon,
    spend: Coins01Icon,
} as const

export const WalletActivity = () => {
    const { data, isLoading } = useCreditsData()
    const latest = data?.latestEvent

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Recent activity</CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex items-center gap-3">
                        <div className="size-9 animate-pulse rounded-full bg-muted" />
                        <div className="flex-1 space-y-1">
                            <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                        </div>
                    </div>
                ) : latest ? (
                    <div className="flex items-center gap-3">
                        <span className="flex size-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                            <HugeiconsIcon
                                icon={ICON_BY_KIND[latest.kind]}
                                className="size-4"
                            />
                        </span>
                        <div className="flex-1 min-w-0">
                            <div className="truncate text-sm font-medium">
                                {latest.label}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {latest.at}
                            </div>
                        </div>
                        <span
                            className={cn(
                                'rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums',
                                latest.amount >= 0
                                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-300',
                            )}
                        >
                            {latest.amount > 0 ? `+${latest.amount}` : latest.amount}
                        </span>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        Nothing here yet — your credit history will show up after your
                        first transaction.
                    </p>
                )}
            </CardContent>
        </Card>
    )
}
