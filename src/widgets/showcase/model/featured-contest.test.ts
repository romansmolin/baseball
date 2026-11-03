import { describe, expect, it } from 'vitest'
import type { DailyContestSummary } from '@/shared/daily-contests'
import { getFeaturedContestAction, selectFeaturedContest } from './featured-contest'

const now = Date.parse('2026-11-01T17:00:00Z')
const contest = (overrides: Partial<DailyContestSummary> = {}): DailyContestSummary => ({
    id: 'evening', name: 'Evening Classic', mode: 'LIVE', status: 'OPEN',
    leagueSlug: 'mlb', contestDate: '2026-11-01', sourceDate: '2026-11-01',
    locksAt: '2026-11-01T19:00:00Z', memberCount: 1472, salaryCap: 80000,
    updatedAt: '2026-11-01T16:00:00Z', ...overrides,
})

describe('dashboard featured contest', () => {
    it('recommends the nearest open contest ahead of locked contests without reordering the input', () => {
        const items = [contest({ id: 'late', locksAt: '2026-11-01T22:00:00Z' }), contest({ id: 'locked', status: 'LOCKED', locksAt: '2026-11-01T16:00:00Z' }), contest()]
        expect(selectFeaturedContest(items, now)?.id).toBe('evening')
        expect(items.map(item => item.id)).toEqual(['late', 'locked', 'evening'])
    })

    it('falls back to the most recent locked contest, including an expired OPEN record', () => {
        expect(selectFeaturedContest([
            contest({ id: 'older', status: 'LOCKED', locksAt: '2026-10-31T19:00:00Z' }),
            contest({ id: 'expired', locksAt: '2026-11-01T16:00:00Z' }),
        ], now)?.id).toBe('expired')
    })

    it('never offers historical, cancelled or completed contests as the next game', () => {
        expect(selectFeaturedContest([
            contest({ mode: 'REPLAY' }), contest({ status: 'COMPLETED' }), contest({ status: 'CANCELLED' }),
        ], now)).toBeNull()
        expect(selectFeaturedContest([], now)).toBeNull()
    })

    it('rejects malformed deadlines and an unknown client clock', () => {
        expect(selectFeaturedContest([contest({ locksAt: 'unavailable' })], now)).toBeNull()
        expect(selectFeaturedContest([contest()], Number.NaN)).toBeNull()
    })

    it('switches from edit to view at the exact lock boundary', () => {
        const record = contest({ locksAt: '2026-11-01T17:00:00Z' })
        expect(getFeaturedContestAction(record, true, now - 1)).toEqual({ href: '/contests/evening', label: 'Edit your lineup', editable: true })
        expect(getFeaturedContestAction(record, true, now)).toEqual({ href: '/contests/evening', label: 'View your entry', editable: false })
    })

    it('offers entry creation only when the absence of an entry is known', () => {
        expect(getFeaturedContestAction(contest(), false, now).label).toBe('Build a lineup · Free')
        expect(getFeaturedContestAction(contest(), null, now).label).toBe('Open contest')
    })

    it('never offers editing for locked, completed or replay contests', () => {
        for (const record of [contest({ status: 'LOCKED' }), contest({ status: 'COMPLETED' }), contest({ mode: 'REPLAY' })]) {
            expect(getFeaturedContestAction(record, false, now)).toEqual({ href: '/contests/evening', label: 'View contest', editable: false })
        }
    })
})
