import { describe, expect, it } from 'vitest'
import { planRecurringStarts, planRecurringHistory, recurringHorizonDays, recurringSources } from '../recurring-calendar'

describe('recurring calendar', () => {
    it('publishes exactly six starts within fourteen calendar days', () => {
        const windows = planRecurringStarts(new Date('2026-11-02T10:00:00Z'))
        expect(windows.map(w => w.startsAt.getUTCDate())).toEqual([2, 4, 6, 9, 11, 13])
        expect(windows.map(w => w.totalWeeks)).toEqual([1, 2, 4, 1, 2, 4])
        expect(windows.every(w => w.startsAt.getUTCHours() === 12)).toBe(true)
        expect(windows.map(w => (w.endsAt.getTime() - w.startsAt.getTime()) / 86400000)).toEqual([7, 14, 28, 7, 14, 28])
    })
    it('excludes a registration cutoff reached exactly now', () => {
        expect(planRecurringStarts(new Date('2026-11-02T12:00:00Z')).map(w => w.startsAt.getUTCDate())).toEqual([4, 6, 9, 11, 13])
    })
    it('keeps UTC boundaries through DST and New Year', () => {
        expect(planRecurringStarts(new Date('2026-11-01T04:30:00Z')).map(w => w.startsAt.getUTCDate())).toEqual([2, 4, 6, 9, 11, 13])
        expect(planRecurringStarts(new Date('2026-12-30T08:00:00Z')).map(w => w.startsAt.toISOString())).toEqual(['2026-12-30T12:00:00.000Z', '2027-01-01T12:00:00.000Z', '2027-01-04T12:00:00.000Z', '2027-01-06T12:00:00.000Z', '2027-01-08T12:00:00.000Z', '2027-01-11T12:00:00.000Z'])
    })
    it('widens the horizon only for valid CONTEST_SERIES_HORIZON_DAYS values', () => {
        expect(recurringHorizonDays({})).toBe(14)
        expect(recurringHorizonDays({ CONTEST_SERIES_HORIZON_DAYS: '150' })).toBe(150)
        for (const value of ['abc', '7', '201', '14.5']) expect(recurringHorizonDays({ CONTEST_SERIES_HORIZON_DAYS: value })).toBe(14)
        const windows = planRecurringStarts(new Date('2026-11-03T10:00:00Z'), 150)
        expect(windows.at(-1)!.startsAt.getTime()).toBeLessThan(Date.parse('2027-04-02T00:00:00Z'))
        expect(windows.some(w => w.startsAt.toISOString() === '2027-03-26T12:00:00.000Z' && w.templateKey === 'grand-championship')).toBe(true)
        expect(() => planRecurringStarts(new Date('2026-11-03T10:00:00Z'), 201)).toThrow('Invalid recurring calendar horizon')
    })
    it('adds a Winter Leagues window for every start only when that source is enabled', () => {
        expect(recurringSources({})).toEqual(['north-america'])
        expect(recurringSources({ CONTEST_WINTER_ENABLED: 'true' })).toEqual(['north-america', 'winter-leagues'])
        const windows = planRecurringStarts(new Date('2026-11-02T10:00:00Z'), 14, recurringSources({ CONTEST_WINTER_ENABLED: 'true' }))
        expect(windows).toHaveLength(12)
        expect(windows.filter(w => w.sourceSlug === 'winter-leagues').map(w => w.startsAt.getUTCDate())).toEqual([2, 4, 6, 9, 11, 13])
    })
    it('plans original historical dates without future starts', () => {
        const windows = planRecurringHistory(new Date('2026-11-02T10:00:00Z'))
        expect(windows).toHaveLength(12)
        expect(windows[0].startsAt.toISOString()).toBe('2026-10-05T12:00:00.000Z')
        expect(windows.at(-1)?.startsAt.toISOString()).toBe('2026-10-30T12:00:00.000Z')
    })
})
