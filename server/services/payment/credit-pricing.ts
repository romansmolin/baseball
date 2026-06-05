// Single source of truth for the credit packs the wallet sells. The server
// owns this list so the price the gateway charges can never be tampered with
// from the client — checkout only accepts a `credits` amount that matches one
// of these packs, and the gateway charge uses the pack's priceCents.

export interface CreditPack {
    credits: number
    priceCents: number
    currency: string
    label: string
}

export const CREDIT_PACKS: readonly CreditPack[] = [
    { credits: 500, priceCents: 400, currency: 'EUR', label: '500 credits — €4.00' },
    { credits: 1200, priceCents: 800, currency: 'EUR', label: '1,200 credits — €8.00' },
    { credits: 2500, priceCents: 1500, currency: 'EUR', label: '2,500 credits — €15.00' },
] as const

export const getCreditPack = (credits: number): CreditPack | undefined =>
    CREDIT_PACKS.find((pack) => pack.credits === credits)
