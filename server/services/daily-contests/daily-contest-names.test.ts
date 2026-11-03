import { describe, expect, it } from 'vitest'
import { dailyContestName, isGenericDailyContestName, themedNameForGenericContest } from './daily-contest-names'

describe('daily contest names', () => {
    it('gives the seven days recognizable distinct names with their actual dates', () => {
        const dates = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07']
        const names = dates.map(date => dailyContestName('winter-leagues', date))
        expect(new Set(names).size).toBe(7)
        expect(names[1]).toMatch(/^Winter Leagues · .+ · Nov 2, 2026$/)
        expect(names[6]).toMatch(/^Winter Leagues · .+ · Nov 7, 2026$/)
    })

    it('keeps different leagues distinct and dates stable across years', () => {
        expect(dailyContestName('mlb', '2026-11-02')).toMatch(/^MLB · .+ · Nov 2, 2026$/)
        expect(dailyContestName('triple-a', '2026-11-02')).toMatch(/^Triple-A · .+ · Nov 2, 2026$/)
        expect(dailyContestName('mlb', '2027-11-01')).toBe(dailyContestName('mlb', '2027-11-01'))
        expect(dailyContestName('north-america', '2026-11-02')).toMatch(/^[^·]+ · Nov 2, 2026$/)
        expect(dailyContestName('north-america', '2026-11-21', 'weekend')).toMatch(/^Weekend Series · .+ · Nov 21, 2026$/)
        expect(dailyContestName('winter-leagues', '2026-11-21', 'weekend')).toMatch(/^Weekend Series · Winter Leagues · .+ · Nov 21, 2026$/)
    })

    it('varies the theme across days of the same weekday and fits the weekday', () => {
        const mondays = Array.from({ length: 20 }, (_, week) => new Date(Date.UTC(2026, 10, 2 + week * 7)).toISOString().slice(0, 10))
        const themes = new Set(mondays.map(date => dailyContestName('north-america', date).split(' · ')[0]))
        expect(themes.size).toBeGreaterThanOrEqual(3)
        for (const theme of themes) expect(theme).toMatch(/Monday|Leadoff|Mound|Batting|Fresh Start/)
    })

    it('renames only one-size-fits-all showcase names', () => {
        expect(themedNameForGenericContest('MLB 2026 Season Classic', '2026-10-28')).toBe(dailyContestName('mlb', '2026-10-28'))
        expect(themedNameForGenericContest('MLB Replay Classic', '2025-07-04')).toMatch(/^MLB · .+ · Jul 4, 2025$/)
        expect(themedNameForGenericContest('MLB Opening Day Special', '2026-10-28')).toBeNull()
        expect(themedNameForGenericContest('Custom MLB 2026 Season Classic', '2026-10-28')).toBeNull()
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
