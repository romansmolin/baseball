import { describe, expect, it } from 'vitest'
import { planRecurringStarts, planRecurringHistory } from '../recurring-calendar'

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
    it('plans original historical dates without future starts', () => {
        const windows = planRecurringHistory(new Date('2026-11-02T10:00:00Z'))
        expect(windows).toHaveLength(12)
        expect(windows[0].startsAt.toISOString()).toBe('2026-10-05T12:00:00.000Z')
        expect(windows.at(-1)?.startsAt.toISOString()).toBe('2026-10-30T12:00:00.000Z')
    })
})
