import { expect, it } from 'vitest'
import { createPaymentDrafts } from './payment-drafts'

it('creates editable rows with a valid date, credit pack, currency and status', () => {
    let id = 0
    const rows = createPaymentDrafts(2, '2026-11-19', () => `gen_${++id}`)
    expect(rows).toEqual([
        { id: 'gen_1', date: '2026-11-19', amount: '8.00', currency: 'EUR', tokens: '1200', status: 'Successful' },
        { id: 'gen_2', date: '2026-11-19', amount: '8.00', currency: 'EUR', tokens: '1200', status: 'Successful' },
    ])
})
