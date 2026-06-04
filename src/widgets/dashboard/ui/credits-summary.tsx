'use client'

import { Add01Icon, GiftIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { useCreditsData } from '@/entities/dashboard'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Separator } from '@/shared/ui/separator'

export const CreditsSummary = () => {
    const { data, error, isLoading } = useCreditsData()
    const balance = data?.balance ?? 0
    const latest = data?.latestEvent

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="text-base">Your credits</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
                <div className="flex flex-col items-center gap-1 py-2">
                    {isLoading ? (
                        <div className="h-12 w-24 animate-pulse rounded bg-muted" />
                    ) : (
                        <span className="font-anton text-5xl text-primary">
                            {balance.toLocaleString()}
                        </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                        {error ? 'Couldn’t load credits' : 'bonus credits from sign-up'}
                    </span>
                </div>
                <Separator />
                {latest ? (
                    <div className="flex items-center gap-3">
                        <span className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary">
                            <HugeiconsIcon icon={GiftIcon} className="size-4" />
                        </span>
                        <div className="flex-1">
                            <div className="text-sm font-medium">{latest.label}</div>
                            <div className="text-xs text-muted-foreground">
                                {latest.amount > 0 ? `+${latest.amount}` : latest.amount} credits
                            </div>
                        </div>
                        <span className="text-xs text-muted-foreground">{latest.at}</span>
                    </div>
                ) : isLoading ? (
                    <div className="flex items-center gap-3">
                        <div className="size-9 animate-pulse rounded-full bg-muted" />
                        <div className="flex-1 space-y-1">
                            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                        </div>
                    </div>
                ) : null}
                <Button variant="outline" className="gap-2">
                    <HugeiconsIcon icon={Add01Icon} className="size-4" />
                    Buy credits
                </Button>
            </CardContent>
        </Card>
    )
}
