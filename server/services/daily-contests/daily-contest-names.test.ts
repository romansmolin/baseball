import { describe, expect, it } from 'vitest'
import { dailyContestName, isGenericDailyContestName } from './daily-contest-names'

describe('daily contest names', () => {
    it('gives the seven days recognizable distinct names with their actual dates', () => {
        const dates = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07']
        const names = dates.map(date => dailyContestName('winter-leagues', date))
        expect(new Set(names).size).toBe(7)
        expect(names[1]).toBe('Winter Leagues · Monday Diamond · Nov 2, 2026')
        expect(names[6]).toBe('Winter Leagues · Saturday Home Run · Nov 7, 2026')
    })

    it('keeps different leagues distinct and dates stable across years', () => {
        expect(dailyContestName('mlb', '2026-11-02')).toBe('MLB · Monday Diamond · Nov 2, 2026')
        expect(dailyContestName('triple-a', '2026-11-02')).toBe('Triple-A · Monday Diamond · Nov 2, 2026')
        expect(dailyContestName('mlb', '2027-11-01')).toBe('MLB · Monday Diamond · Nov 1, 2027')
    })

    it('recognizes only the exact existing generated names for the matching league', () => {
        expect(isGenericDailyContestName('winter-leagues', 'Winter Leagues Daily Classic')).toBe(true)
        expect(isGenericDailyContestName('mlb', 'MLB Daily Classic')).toBe(true)
        expect(isGenericDailyContestName('winter-leagues', 'Custom Winter Leagues Daily Classic')).toBe(false)
        expect(isGenericDailyContestName('mlb', 'Winter Leagues Daily Classic')).toBe(false)
        expect(isGenericDailyContestName('unknown', 'UNKNOWN Daily Classic')).toBe(false)
    })

    it('rejects invalid or impossible calendar dates', () => {
        expect(() => dailyContestName('mlb', '2026-02-30')).toThrow('Invalid contest date')
        expect(() => dailyContestName('mlb', 'not-a-date')).toThrow('Invalid contest date')
    })
})
