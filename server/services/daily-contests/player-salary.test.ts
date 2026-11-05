import { describe, expect, it } from 'vitest'
import { playerSalary, salaryStatsSeason } from './player-salary'

describe('player salary', () => {
    it('prices players on last season and keeps small samples and unknowns cheap', () => {
        const star = playerSalary({ battingStats: { ops: '.950', plateAppearances: 600 } })
        const regular = playerSalary({ battingStats: { ops: '.720', plateAppearances: 500 } })
        expect(star).toBe(10000)
        expect(regular).toBeGreaterThan(4000)
        expect(regular).toBeLessThan(star)
        expect(playerSalary({ battingStats: { ops: '1.100', plateAppearances: 20 } })).toBe(5500)
        expect(playerSalary({ pitchingStats: { era: '2.50', inningsPitched: '180.0' } })).toBe(10000)
        expect(playerSalary({ pitchingStats: { era: '-.--', inningsPitched: '0.0' } })).toBe(4000)
        expect(playerSalary({})).toBe(4000)
    })

    it('prices a two-way player on the better side', () => {
        expect(playerSalary({ battingStats: { ops: '.600', plateAppearances: 300 }, pitchingStats: { era: '2.50', inningsPitched: '100.0' } })).toBe(10000)
    })

    it('uses the last season with a meaningful sample', () => {
        expect(salaryStatsSeason(2027, new Date('2026-11-03T00:00:00Z'))).toBe(2026)
        expect(salaryStatsSeason(2027, new Date('2027-04-10T00:00:00Z'))).toBe(2026)
        expect(salaryStatsSeason(2027, new Date('2027-07-01T00:00:00Z'))).toBe(2027)
    })
})
