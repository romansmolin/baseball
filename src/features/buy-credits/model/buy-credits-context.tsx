'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export interface OpenBuyCreditsOptions {
    // The AI feature that triggered the prompt, used to tailor the copy
    // ("This feature costs 20 credits"). Both optional — opened from the
    // wallet "Buy credits" button there is no feature context.
    featureName?: string
    featureCost?: number
}

interface BuyCreditsContextValue {
    isOpen: boolean
    featureName: string | null
    featureCost: number | null
    open: (options?: OpenBuyCreditsOptions) => void
    close: () => void
}

const BuyCreditsContext = createContext<BuyCreditsContextValue | null>(null)

export const useBuyCredits = (): BuyCreditsContextValue => {
    const ctx = useContext(BuyCreditsContext)
    if (!ctx) {
        throw new Error('useBuyCredits must be used within a BuyCreditsProvider')
    }
    return ctx
}

export const BuyCreditsStateProvider = ({ children }: { children: ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false)
    const [featureName, setFeatureName] = useState<string | null>(null)
    const [featureCost, setFeatureCost] = useState<number | null>(null)

    const open = useCallback((options?: OpenBuyCreditsOptions) => {
        setFeatureName(options?.featureName ?? null)
        setFeatureCost(options?.featureCost ?? null)
        setIsOpen(true)
    }, [])

    const close = useCallback(() => setIsOpen(false), [])

    const value = useMemo<BuyCreditsContextValue>(
        () => ({ isOpen, featureName, featureCost, open, close }),
        [isOpen, featureName, featureCost, open, close],
    )

    return <BuyCreditsContext.Provider value={value}>{children}</BuyCreditsContext.Provider>
}
