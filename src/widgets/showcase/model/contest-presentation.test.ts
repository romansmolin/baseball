import { describe, expect, it } from 'vitest'
import type { DailyContestSummary } from '@/shared/daily-contests'
import { dailyContestSourceLabel, dailyContestViewLabel } from './contest-presentation'

const contest = (overrides: Partial<DailyContestSummary> = {}) => ({ id: 'id', name: 'Classic', mode: 'LIVE' as const, status: 'OPEN' as const, leagueSlug: 'winter-leagues', contestDate: '2026-11-01', sourceDate: '2026-11-01', locksAt: '2026-11-01T20:00:00Z', memberCount: 1, salaryCap: 80000, updatedAt: '2026-11-01T12:00:00Z', ...overrides })

describe('contest presentation', () => {
    it('uses a readable label for winter league contests', () => {
        expect(dailyContestSourceLabel(contest())).toBe('Winter Leagues')
    })

    it('labels every completed contest as history regardless of source mode', () => {
        expect(dailyContestViewLabel(contest({ mode: 'LIVE', status: 'COMPLETED' }))).toBe('Completed contest')
        expect(dailyContestViewLabel(contest({ mode: 'REPLAY', status: 'COMPLETED' }))).toBe('Completed contest')
    })
})
