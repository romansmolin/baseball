// Single source of truth for what the wallet sells. The server owns this file
// so the price the gateway charges can never be tampered with from the client:
//   - pack purchase   → checkout only accepts a `credits` amount matching a pack
//   - custom purchase → checkout accepts an `amountCents` inside the allowed
//                       range and derives the credits itself from the rate
//                       ladder below (the client's preview is never trusted)

// Relative import: this module is exercised by Vitest, which does not resolve
// the `@/` tsconfig alias for value imports (same reason as prisma enums).
import { quoteCredits } from '../../../src/shared/wallet/credit-quote'
import type { CreditPricing, CreditRateTier } from '../../../src/shared/wallet/types'

export interface CreditPack {
    credits: number
    priceCents: number
    currency: string
    label: string
}

export const CREDIT_CURRENCY = 'EUR'

export const CREDIT_PACKS: readonly CreditPack[] = [
    { credits: 500, priceCents: 400, currency: 'EUR', label: '500 credits — €4.00' },
    { credits: 1200, priceCents: 800, currency: 'EUR', label: '1,200 credits — €8.00' },
    { credits: 2500, priceCents: 1500, currency: 'EUR', label: '2,500 credits — €15.00' },
] as const

// Custom top-up bounds. The floor keeps gateway fees a sane share of the
// charge; the ceiling caps chargeback exposure on a single transaction.
export const CUSTOM_MIN_AMOUNT_CENTS = 200
export const CUSTOM_MAX_AMOUNT_CENTS = 50_000

// Each tier is anchored to a pack, so a custom amount gets exactly the rate of
// the pack at that spend level and bigger spends keep earning a better rate.
export const CREDIT_RATE_TIERS: readonly CreditRateTier[] = [
    { minAmountCents: CUSTOM_MIN_AMOUNT_CENTS, credits: 500, perAmountCents: 400 },
    { minAmountCents: 800, credits: 1200, perAmountCents: 800 },
    { minAmountCents: 1500, credits: 2500, perAmountCents: 1500 },
] as const

export const getCreditPack = (credits: number): CreditPack | undefined =>
    CREDIT_PACKS.find((pack) => pack.credits === credits)

export const getCreditPricing = (): CreditPricing => ({
    currency: CREDIT_CURRENCY,
    minAmountCents: CUSTOM_MIN_AMOUNT_CENTS,
    maxAmountCents: CUSTOM_MAX_AMOUNT_CENTS,
    tiers: [...CREDIT_RATE_TIERS],
})

export interface CustomPurchaseQuote {
    credits: number
    priceCents: number
    currency: string
}

// Authoritative quote for a custom amount. Returns undefined when the amount is
// outside the allowed range so the caller can reject the checkout.
export const quoteCustomPurchase = (amountCents: number): CustomPurchaseQuote | undefined => {
    if (!Number.isInteger(amountCents)) return undefined
    if (amountCents < CUSTOM_MIN_AMOUNT_CENTS || amountCents > CUSTOM_MAX_AMOUNT_CENTS) {
        return undefined
    }

    const credits = quoteCredits(amountCents, CREDIT_RATE_TIERS)
    if (credits < 1) return undefined

    return { credits, priceCents: amountCents, currency: CREDIT_CURRENCY }
}
