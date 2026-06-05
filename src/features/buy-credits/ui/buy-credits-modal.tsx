'use client'

import { Cancel01Icon, Coins01Icon, ShoppingCart02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Dialog } from '@base-ui/react/dialog'

import { useCreditPacksData, useWalletData } from '@/entities/wallet'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/utils'
import type { CreditPack } from '@/shared/wallet'

import { useBuyCredits } from '../model/buy-credits-context'
import { useCheckout } from '../model/use-checkout'

const formatPrice = (pack: CreditPack): string =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: pack.currency }).format(
        pack.priceCents / 100,
    )

export const BuyCreditsModal = () => {
    const { isOpen, close, featureName, featureCost } = useBuyCredits()
    const { data: packs, isLoading } = useCreditPacksData()
    const { data: wallet } = useWalletData()
    const { buy, pendingCredits } = useCheckout()

    const balance = wallet?.balance ?? 0
    // "Out of credits" framing whenever a feature triggered the prompt; the
    // bare "Buy credits" framing is used when opened from the wallet.
    const triggeredByFeature = featureName != null || featureCost != null

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => (open ? undefined : close())}>
            <Dialog.Portal>
                <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
                <Dialog.Popup
                    className={cn(
                        'fixed top-1/2 left-1/2 z-50 flex w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col',
                        'rounded-2xl border border-foreground/10 bg-card shadow-2xl outline-none transition-all',
                        'data-[ending-style]:scale-95 data-[ending-style]:opacity-0',
                        'data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
                    )}
                >
                    <div className="flex items-start justify-between gap-3 border-b border-foreground/10 px-5 py-4">
                        <div className="min-w-0">
                            <Dialog.Title className="font-medium">
                                {triggeredByFeature ? 'Out of credits' : 'Buy credits'}
                            </Dialog.Title>
                            <Dialog.Description className="mt-0.5 text-xs text-muted-foreground">
                                {featureCost != null ? (
                                    <>
                                        {featureName ? `${featureName} costs` : 'This feature costs'}{' '}
                                        {featureCost} credits — you have {balance.toLocaleString()}.
                                        Top up to continue.
                                    </>
                                ) : triggeredByFeature ? (
                                    <>
                                        You don&apos;t have enough credits
                                        {featureName ? ` to use ${featureName}` : ''}. Top up to
                                        continue.
                                    </>
                                ) : (
                                    <>Pick a pack to top up your balance.</>
                                )}
                            </Dialog.Description>
                        </div>
                        <button
                            type="button"
                            onClick={close}
                            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            aria-label="Close"
                        >
                            <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
                        </button>
                    </div>

                    <div className="flex flex-col gap-2 px-5 py-4">
                        {isLoading || !packs ? (
                            <PacksSkeleton />
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
                    </div>
                </Dialog.Popup>
            </Dialog.Portal>
        </Dialog.Root>
    )
}

const PacksSkeleton = () => (
    <div className="space-y-2">
        {[0, 1, 2].map((i) => (
            <div key={i} className="h-[60px] animate-pulse rounded-xl bg-muted" />
        ))}
    </div>
)
