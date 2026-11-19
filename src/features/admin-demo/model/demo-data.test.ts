import { describe, expect, it } from 'vitest'
import { generateDemoActivity, maxDemoLastDate } from './demo-data'

describe('demo activity', () => {
    it('uses baseball feature prices and spends the requested credits', () => {
        const rows = generateDemoActivity({ firstDate: '2026-01-01', lastDate: '2026-01-31', tokens: 900 }, () => 0.5)
        expect(rows.reduce((sum, row) => sum + row.tokens, 0)).toBe(900)
        expect(rows[0].totalSpent).toBe(900)
        expect(rows.every((row) => ['Game analysis', 'Performer analytics', 'Team autofill'].includes(row.type))).toBe(true)
    })
    it('generates activity above the former 50,000 credit limit', () => {
        const rows = generateDemoActivity({ firstDate: '2026-01-01', lastDate: '2026-01-31', tokens: 100_000 }, () => 0.5)
        expect(rows.reduce((sum, row) => sum + row.tokens, 0)).toBe(100_000)
        expect(rows[0].totalSpent).toBe(100_000)
    })
    it('enforces the six month period and achievable spend', () => {
        expect(maxDemoLastDate('2026-08-31')).toBe('2027-02-28')
        expect(() => generateDemoActivity({ firstDate: '2026-01-01', lastDate: '2026-08-01', tokens: 100 })).toThrow('6 months')
        expect(() => generateDemoActivity({ firstDate: '2026-01-01', lastDate: '2026-01-02', tokens: 101 })).toThrow('Tokens spend')
    })
})
