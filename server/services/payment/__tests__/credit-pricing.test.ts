import { describe, expect, it } from 'vitest'

import {
    CREDIT_PACKS,
    CREDIT_RATE_TIERS,
    CUSTOM_MAX_AMOUNT_CENTS,
    CUSTOM_MIN_AMOUNT_CENTS,
    quoteCustomPurchase,
} from '../credit-pricing'
import { quoteCredits } from '../../../../src/shared/wallet/credit-quote'

describe('quoteCustomPurchase', () => {
    it('gives every pack price exactly the pack credits', () => {
        for (const pack of CREDIT_PACKS) {
            expect(quoteCustomPurchase(pack.priceCents)?.credits).toBe(pack.credits)
        }
    })

    it('charges exactly what the user asked to spend', () => {
        expect(quoteCustomPurchase(1234)).toEqual({
            credits: 1851, // 12.34 € at the 150/€ tier
            priceCents: 1234,
            currency: 'EUR',
        })
    })

    it('rounds credits down, never up', () => {
        // 2.01 € at 125/€ = 251.25 credits
        expect(quoteCustomPurchase(201)?.credits).toBe(251)
    })

    it('applies a better rate as the amount crosses a tier', () => {
        const rateAt = (cents: number) => quoteCredits(cents, CREDIT_RATE_TIERS) / cents

        expect(rateAt(700)).toBeLessThan(rateAt(800))
        expect(rateAt(1400)).toBeLessThan(rateAt(1500))
    })

    it('rejects amounts outside the allowed range', () => {
        expect(quoteCustomPurchase(CUSTOM_MIN_AMOUNT_CENTS - 1)).toBeUndefined()
        expect(quoteCustomPurchase(CUSTOM_MAX_AMOUNT_CENTS + 1)).toBeUndefined()
        expect(quoteCustomPurchase(0)).toBeUndefined()
        expect(quoteCustomPurchase(-500)).toBeUndefined()
    })

    it('rejects fractional cents', () => {
        expect(quoteCustomPurchase(500.5)).toBeUndefined()
    })
})
