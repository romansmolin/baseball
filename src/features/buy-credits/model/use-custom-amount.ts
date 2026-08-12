'use client'

import { useMemo, useState } from 'react'

import { useCreditPricingData } from '@/entities/wallet'
import { creditsPerUnit, quoteCredits } from '@/shared/wallet'

import { useCheckout } from './use-checkout'

// Accepts "12", "12.5", "12,50" — the comma decimal separator is what most
// euro-zone users type. Returns null when the text is not a usable amount.
const parseAmountCents = (input: string): number | null => {
    const normalized = input.trim().replace(',', '.')
    if (normalized === '' || !/^\d*\.?\d*$/.test(normalized)) return null

    const value = Number(normalized)
    if (!Number.isFinite(value) || value <= 0) return null

    return Math.round(value * 100)
}

const formatMoney = (cents: number, currency: string): string =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100)

// Drives the "spend this much" input: parses what the user typed, quotes the
// credits locally from the server's rate ladder, and reports why an amount is
// not buyable. The quote is a preview — the server re-derives it at checkout.
export function useCustomAmount() {
    const [amount, setAmount] = useState('')
    const { data: pricing, isLoading } = useCreditPricingData()
    const { buyCustom, pendingAmountCents, isPending } = useCheckout()

    const amountCents = useMemo(() => parseAmountCents(amount), [amount])

    const credits = useMemo(
        () => (amountCents != null && pricing ? quoteCredits(amountCents, pricing.tiers) : 0),
        [amountCents, pricing],
    )

    const rate = useMemo(
        () => (amountCents != null && pricing ? creditsPerUnit(amountCents, pricing.tiers) : 0),
        [amountCents, pricing],
    )

    const currency = pricing?.currency ?? 'EUR'

    const error = useMemo(() => {
        if (!pricing || amount.trim() === '') return null
        if (amountCents == null) return 'Enter an amount like 12.50'
        if (amountCents < pricing.minAmountCents) {
            return `Minimum is ${formatMoney(pricing.minAmountCents, currency)}`
        }
        if (amountCents > pricing.maxAmountCents) {
            return `Maximum is ${formatMoney(pricing.maxAmountCents, currency)}`
        }
        return null
    }, [amount, amountCents, currency, pricing])

    const canBuy = error === null && credits > 0 && !isPending

    const buy = async (): Promise<void> => {
        if (!canBuy || amountCents == null) return
        await buyCustom(amountCents)
    }

    // Next tier up, so we can nudge the user toward the better rate.
    const nextTier = useMemo(() => {
        if (!pricing || amountCents == null) return null

        const upcoming = pricing.tiers
            .filter((tier) => tier.minAmountCents > amountCents)
            .sort((a, b) => a.minAmountCents - b.minAmountCents)[0]
        if (!upcoming) return null

        return {
            atAmount: formatMoney(upcoming.minAmountCents, currency),
            rate: creditsPerUnit(upcoming.minAmountCents, pricing.tiers),
        }
    }, [amountCents, currency, pricing])

    return {
        amount,
        setAmount,
        amountCents,
        credits,
        rate,
        currency,
        error,
        canBuy,
        buy,
        nextTier,
        isLoading,
        isProcessing: pendingAmountCents !== null,
        isPending,
        minAmountLabel: pricing ? formatMoney(pricing.minAmountCents, currency) : null,
        maxAmountLabel: pricing ? formatMoney(pricing.maxAmountCents, currency) : null,
    }
}
