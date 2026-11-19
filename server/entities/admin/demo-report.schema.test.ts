import { expect, it } from 'vitest'
import { createDemoReportSchema } from './demo-report.schema'

it('accepts reports with more than 50,000 activity rows', () => {
    const row = { index: 1, date: '2026-01-01', time: '12:00', type: 'Game analysis', tokens: 300, amountCents: 300, currency: 'EUR', status: 'Successful', totalSpent: 300 }
    expect(createDemoReportSchema.safeParse({ email: 'user@example.com', period: '2026-01-01 - 2026-01-31', activity: Array(50_001).fill(row), payments: null }).success).toBe(true)
})
