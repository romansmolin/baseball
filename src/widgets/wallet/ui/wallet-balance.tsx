'use client'

import {
    Add01Icon,
    Coins01Icon,
    ShoppingCart02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { useCreditsData } from '@/entities/dashboard'
import { Button } from '@/shared/ui/button'

export const WalletBalance = () => {
    const { data, error, isLoading } = useCreditsData()
    const balance = data?.balance ?? 0

    return (
        <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-linear-to-br from-primary/15 via-primary/5 to-background p-8">
            <div
                aria-hidden
                className="pointer-events-none absolute -right-12 -top-12 size-56 rounded-full bg-primary/15 blur-3xl"
            />

            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-foreground/5 px-3 py-1 text-xs font-medium text-muted-foreground">
                        <HugeiconsIcon icon={Coins01Icon} className="size-3.5" />
                        Current balance
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        {isLoading ? (
                            <div className="h-12 w-32 animate-pulse rounded bg-muted" />
                        ) : (
                            <span className="font-anton text-6xl text-primary tabular-nums">
                                {balance.toLocaleString()}
                            </span>
                        )}
                        <span className="font-anton text-2xl text-muted-foreground">
                            cr
                        </span>
                    </div>
                    {error ? (
                        <p className="mt-1 text-xs text-destructive">
                            Couldn&apos;t load balance.
                        </p>
                    ) : null}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                    <Button variant="default" className="gap-2">
                        <HugeiconsIcon icon={Add01Icon} className="size-4" />
                        Buy credits
                    </Button>
                    <Button variant="outline" className="gap-2">
                        <HugeiconsIcon icon={ShoppingCart02Icon} className="size-4" />
                        Redeem
                    </Button>
                </div>
            </div>
        </section>
    )
}
