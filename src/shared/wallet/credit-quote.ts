// Pure euro → credits math, shared by the server (authoritative, at checkout)
// and the client (live preview while typing). Keeping one implementation means
// the number the user sees before paying is the number they get granted.

import type { CreditRateTier } from './types'

// Highest tier whose threshold the amount reaches. Tiers may arrive in any
// order — the reduce picks the best match rather than trusting the sort.
export const findCreditRateTier = (
    amountCents: number,
    tiers: readonly CreditRateTier[],
): CreditRateTier | undefined =>
    tiers.reduce<CreditRateTier | undefined>((best, tier) => {
        if (amountCents < tier.minAmountCents) return best
        if (!best || tier.minAmountCents > best.minAmountCents) return tier
        return best
    }, undefined)

// Credits granted for an arbitrary amount. Always rounds down: the user is
// never charged for a fraction of a credit they don't receive.
export const quoteCredits = (amountCents: number, tiers: readonly CreditRateTier[]): number => {
    if (!Number.isFinite(amountCents) || amountCents <= 0) return 0

    const tier = findCreditRateTier(amountCents, tiers)
    if (!tier) return 0

    return Math.floor((amountCents * tier.credits) / tier.perAmountCents)
}

// Effective credits per one unit of currency, for display ("≈ 166 credits per €1").
export const creditsPerUnit = (amountCents: number, tiers: readonly CreditRateTier[]): number => {
    if (amountCents <= 0) return 0

    return Math.floor((quoteCredits(amountCents, tiers) / amountCents) * 100)
}
