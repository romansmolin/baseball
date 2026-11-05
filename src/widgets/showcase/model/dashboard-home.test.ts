import { describe, expect, it } from 'vitest'
import type { ContestCatalogItem } from '@/shared/tournaments'
import { activeTime, barWidth, formatCountdown, gapToLeader, groupContestsBySchedule, isOverdue, selectNextContest, winningMargin } from './dashboard-home'

const now = Date.parse('2026-11-03T12:00:00Z')
const item = (over: Partial<ContestCatalogItem>): ContestCatalogItem => ({
    id: 'a', kind: 'DAILY', name: 'Daily Lineup', leagueSlug: 'north-america', status: 'OPEN',
    startsAt: '2026-11-04T00:00:00Z', endsAt: '2026-11-05T00:00:00Z', locksAt: '2026-11-04T23:00:00Z',
    memberCount: 0, entryFeeCredits: 0, prizePoolCredits: 0, ...over,
})

describe('dashboard home selection', () => {
    it('picks the open contest that closes first and ignores closed ones', () => {
        const items = [
            item({ id: 'late', locksAt: '2026-11-05T23:00:00Z' }),
            item({ id: 'gone', locksAt: '2026-11-03T11:00:00Z' }),
            item({ id: 'soon', locksAt: '2026-11-04T01:00:00Z' }),
            item({ id: 'locked', status: 'LOCKED', locksAt: '2026-11-03T13:00:00Z' }),
        ]
        expect(selectNextContest(items, now)?.id).toBe('soon')
        expect(selectNextContest([], now)).toBeNull()
        expect(selectNextContest(items, Number.NaN)).toBeNull()
    })

    it('groups unfinished contests into today, this month, the next two months and later', () => {
        const at = (id: string, locksAt: string, status: ContestCatalogItem['status'] = 'OPEN') => item({ id, locksAt, startsAt: locksAt, status })
        const schedule = groupContestsBySchedule([
            at('done', '2026-11-03T20:00:00Z', 'COMPLETED'),
            at('later', '2027-03-02T20:00:00Z'),
            at('december', '2026-12-05T20:00:00Z'),
            at('month', '2026-11-20T20:00:00Z'),
            at('tonight', '2026-11-03T23:00:00Z'),
            at('running', '2026-11-01T20:00:00Z', 'IN_SEASON'),
            at('january', '2027-01-31T20:00:00Z'),
            at('series', '2027-03-26T12:00:00Z', 'DRAFTING'),
        ], now)
        expect(schedule.today.map(row => row.id)).toEqual(['running', 'tonight'])
        expect(schedule.thisMonth.map(row => row.id)).toEqual(['month'])
        expect(schedule.nextMonths.map(row => row.id)).toEqual(['december', 'january'])
        expect(schedule.later.map(row => row.id)).toEqual(['later', 'series'])
    })

    it('drops contests in play that ended more than a day ago and orders the rest by end date', () => {
        const live = (id: string, endsAt: string, over: Partial<ContestCatalogItem> = {}) =>
            item({ id, kind: 'LEAGUE', status: 'IN_SEASON', startsAt: '2026-06-29T19:00:00Z', locksAt: null, endsAt, ...over })
        const stale = live('stale', '2026-09-07T00:00:00Z')
        expect(isOverdue(stale, now)).toBe(true)
        expect(isOverdue(live('recent', '2026-11-02T20:00:00Z'), now)).toBe(false)
        expect(isOverdue(item({ status: 'OPEN', endsAt: '2020-01-01T00:00:00Z' }), now)).toBe(false)
        const schedule = groupContestsBySchedule([live('later', '2026-11-24T00:00:00Z'), stale, live('sooner', '2026-11-14T00:00:00Z'), live('recent', '2026-11-02T20:00:00Z')], now)
        expect(schedule.today.map(row => row.id)).toEqual(['recent', 'sooner', 'later'])
        expect(activeTime(live('x', '2026-11-14T00:00:00Z'))).toBe(Date.parse('2026-11-14T00:00:00Z'))
    })

    it('formats countdowns and the gap to the leader', () => {
        expect(formatCountdown(now + 5 * 3600000 + 20 * 60000, now)).toBe('5h 20m')
        expect(formatCountdown(now + 26 * 3600000, now)).toBe('1d 2h')
        expect(formatCountdown(now - 1, now)).toBe('now')
        expect(winningMargin([{ points: 184.6 }, { points: 181.6 }, { points: 150 }])).toBeCloseTo(3)
        expect(winningMargin([{ points: 10 }])).toBeNull()
        expect([barWidth(184.6, 184.6), barWidth(92.3, 184.6), barWidth(1, 184.6), barWidth(5, 0)]).toEqual([100, 50, 8, 0])
        expect(gapToLeader(176.2, 184.6, 'Ann', false)).toBe('8.4 pts behind Ann.')
        expect(gapToLeader(184.6, 184.6, 'Ann', true)).toBe('You are leading the standings.')
    })
})
