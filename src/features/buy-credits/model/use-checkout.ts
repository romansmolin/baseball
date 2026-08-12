'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { createCheckout, createCustomCheckout } from '@/entities/wallet'

// Starts a hosted checkout — either for a fixed credit pack or for a custom
// amount the user typed — and redirects the browser to the gateway. Tracks what
// is currently processing (pack by credit amount, custom by cents) so callers
// can show a per-button spinner without letting a second checkout start.
export function useCheckout() {
    const [pendingCredits, setPendingCredits] = useState<number | null>(null)
    const [pendingAmountCents, setPendingAmountCents] = useState<number | null>(null)

    const isPending = pendingCredits !== null || pendingAmountCents !== null

    const start = async (
        request: () => Promise<{ redirectUrl: string }>,
        reset: () => void,
    ): Promise<void> => {
        try {
            const { redirectUrl } = await request()
            window.location.href = redirectUrl
        } catch {
            toast.error('Could not start checkout. Please try again.')
            reset()
        }
    }

    const buy = async (credits: number): Promise<void> => {
        if (isPending) return
        setPendingCredits(credits)
        await start(
            () => createCheckout(credits),
            () => setPendingCredits(null),
        )
    }

    const buyCustom = async (amountCents: number): Promise<void> => {
        if (isPending) return
        setPendingAmountCents(amountCents)
        await start(
            () => createCustomCheckout(amountCents),
            () => setPendingAmountCents(null),
        )
    }

    return { buy, buyCustom, pendingCredits, pendingAmountCents, isPending }
}
