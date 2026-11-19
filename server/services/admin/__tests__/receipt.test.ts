import { describe, expect, it } from 'vitest'
import { buildReceipt } from '../receipt'

const payment = { id: 'payment-1', status: 'SUCCESSFUL', amountCents: 800, currency: 'EUR', creditAmount: 1200, createdAt: new Date('2026-11-01T12:00:00Z'), user: { email: 'user@example.com' } }
describe('admin receipt', () => {
    it('creates a stable receipt for a completed credit purchase', () => {
        const receipt = buildReceipt(payment, { status: 'COMPLETED', amount: 1200 })
        expect(receipt.receiptId).toBe(buildReceipt(payment, { status: 'COMPLETED', amount: 1200 }).receiptId)
        expect(receipt).toMatchObject({ email: 'user@example.com', amountCents: 800, credits: 1200 })
    })
    it('rejects unpaid or uncredited payments', () => {
        expect(() => buildReceipt({ ...payment, status: 'PENDING' }, { status: 'COMPLETED', amount: 1200 })).toThrow()
        expect(() => buildReceipt(payment, null)).toThrow()
    })
})
