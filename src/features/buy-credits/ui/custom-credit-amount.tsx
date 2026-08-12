'use client'

import { Coins01Icon, ShoppingCart02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { cn } from '@/shared/utils'

import { useCustomAmount } from '../model/use-custom-amount'

const currencySymbol = (currency: string): string =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency })
        .formatToParts(0)
        .find((part) => part.type === 'currency')?.value ?? currency

// "Spend this much" purchase: the user types an amount, we show the credits it
// buys at the current rate, and checkout charges exactly that amount.
export const CustomCreditAmount = ({ className }: { className?: string }) => {
    const {
        amount,
        setAmount,
        credits,
        rate,
        currency,
        error,
        canBuy,
        buy,
        nextTier,
        isLoading,
        isProcessing,
        minAmountLabel,
        maxAmountLabel,
    } = useCustomAmount()

    if (isLoading) {
        return <div className={cn('h-[92px] animate-pulse rounded-xl bg-muted', className)} />
    }

    return (
        <div className={cn('rounded-xl border border-foreground/10 px-4 py-3', className)}>
            <div className="flex items-center justify-between gap-3">
                <label
                    htmlFor="custom-credit-amount"
                    className="text-sm font-medium whitespace-nowrap"
                >
                    Custom amount
                </label>
                {minAmountLabel && maxAmountLabel && (
                    <span className="text-xs text-muted-foreground">
                        {minAmountLabel} – {maxAmountLabel}
                    </span>
                )}
            </div>

            <div className="mt-2 flex items-center gap-2">
                <div className="relative flex-1">
                    <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                        {currencySymbol(currency)}
                    </span>
                    <Input
                        id="custom-credit-amount"
                        inputMode="decimal"
                        autoComplete="off"
                        placeholder="10.00"
                        aria-invalid={!!error}
                        aria-describedby="custom-credit-amount-hint"
                        className="pl-7 tabular-nums"
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                    />
                </div>
                <Button
                    size="sm"
                    className="gap-1.5"
                    disabled={!canBuy}
                    onClick={() => void buy()}
                >
                    <HugeiconsIcon icon={ShoppingCart02Icon} className="size-4" />
                    {isProcessing ? 'Processing…' : 'Buy'}
                </Button>
            </div>

            <p
                id="custom-credit-amount-hint"
                className={cn(
                    'mt-2 flex items-center gap-1.5 text-xs',
                    error ? 'text-destructive' : 'text-muted-foreground',
                )}
            >
                {error ? (
                    error
                ) : credits > 0 ? (
                    <>
                        <HugeiconsIcon icon={Coins01Icon} className="size-3.5 text-primary" />
                        <span className="font-medium text-foreground tabular-nums">
                            {credits.toLocaleString()} credits
                        </span>
                        <span>
                            · {rate.toLocaleString()} per {currencySymbol(currency)}1
                        </span>
                        {nextTier && (
                            <span className="hidden sm:inline">
                                · {nextTier.atAmount}+ gets {nextTier.rate.toLocaleString()} per{' '}
                                {currencySymbol(currency)}1
                            </span>
                        )}
                    </>
                ) : (
                    'Enter an amount to see how many credits you get'
                )}
            </p>
        </div>
    )
}
