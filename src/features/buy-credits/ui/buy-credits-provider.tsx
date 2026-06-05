'use client'

import type { ReactNode } from 'react'

import { BuyCreditsStateProvider } from '../model/buy-credits-context'

import { BuyCreditsModal } from './buy-credits-modal'

// Wrap the authed app once so any descendant can call `useBuyCredits().open()`
// to surface the credit-pack modal. The modal itself lives here so it mounts
// exactly once regardless of how many features trigger it.
export const BuyCreditsProvider = ({ children }: { children: ReactNode }) => (
    <BuyCreditsStateProvider>
        {children}
        <BuyCreditsModal />
    </BuyCreditsStateProvider>
)
