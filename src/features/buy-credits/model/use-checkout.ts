'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { createCheckout } from '@/entities/wallet'

// Starts a hosted checkout for a credit pack and redirects the browser to the
// gateway. Tracks which pack (by credit amount) is currently processing so the
// caller can show a per-button spinner.
export function useCheckout() {
    const [pendingCredits, setPendingCredits] = useState<number | null>(null)

    const buy = async (credits: number): Promise<void> => {
        if (pendingCredits !== null) return
        setPendingCredits(credits)
        try {
            const { redirectUrl } = await createCheckout(credits)
            window.location.href = redirectUrl
        } catch {
            toast.error('Could not start checkout. Please try again.')
            setPendingCredits(null)
        }
    }

    return { buy, pendingCredits }
}
