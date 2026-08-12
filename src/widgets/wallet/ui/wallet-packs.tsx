'use client'

import { Coins01Icon, ShoppingCart02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { useCreditPacksData } from '@/entities/wallet'
import { CustomCreditAmount, useCheckout } from '@/features/buy-credits'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import type { CreditPack } from '@/shared/wallet'

const formatPrice = (pack: CreditPack): string =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: pack.currency }).format(
        pack.priceCents / 100,
    )

export const WalletPacks = () => {
    const { data: packs, isLoading } = useCreditPacksData()
    const { buy, pendingCredits } = useCheckout()

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Buy credits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {isLoading || !packs ? (
                    <div className="space-y-2">
                        {[0, 1, 2].map((i) => (
                            <div key={i} className="h-[60px] animate-pulse rounded-xl bg-muted" />
                        ))}
                    </div>
                ) : (
                    packs.map((pack) => (
                        <div
                            key={pack.credits}
                            className="flex items-center justify-between rounded-xl border border-foreground/10 px-4 py-3"
                        >
                            <div className="flex items-center gap-2.5">
                                <span className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary">
                                    <HugeiconsIcon icon={Coins01Icon} className="size-4" />
                                </span>
                                <div>
                                    <div className="font-medium tabular-nums">
                                        {pack.credits.toLocaleString()} credits
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {formatPrice(pack)}
                                    </div>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                className="gap-1.5"
                                disabled={pendingCredits !== null}
                                onClick={() => void buy(pack.credits)}
                            >
                                <HugeiconsIcon icon={ShoppingCart02Icon} className="size-4" />
                                {pendingCredits === pack.credits ? 'Processing…' : 'Buy'}
                            </Button>
                        </div>
                    ))
                )}

                <CustomCreditAmount />
            </CardContent>
        </Card>
    )
}
