import { describe, expect, it } from 'vitest'

import { buildReceiptEmail } from '../receipt-email'

describe('buildReceiptEmail', () => {
    it('carries everything the card schemes require on a receipt', () => {
        const email = buildReceiptEmail({ to: 'a@b.c', transactionId: 'tx_123', amountCents: 800, currency: 'EUR', credits: 1200, paidAt: new Date('2026-11-04T10:30:00Z') })

        for (const part of ['€8.00', '1,200 credits', '2026-11-04 10:30 UTC', 'tx_123', 'CODERUSH SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ', 'https://www.mybaseballfantasy.com', '/legal/refunds']) {
            expect(email.text).toContain(part)
        }
        expect(email.html).toContain('/legal/refunds')
    })
})
