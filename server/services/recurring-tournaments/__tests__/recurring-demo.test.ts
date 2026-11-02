import { describe, expect, it } from 'vitest'
import { planRecurringDemoEntries } from '../recurring-demo-plan'
import { validateDailyLineup } from '../../daily-contests/daily-rules'
import { pool } from './fixtures'
import type { RecurringTournamentContext } from '../recurring.types'

const startsAt = new Date('2093-11-02T12:00:00Z')
const context: RecurringTournamentContext = { leagueId: 'league-a', publishedAt: new Date('2093-10-19T12:00:00Z'), window: { templateKey: 'weekly-sprint', sourceSlug: 'winter-leagues', startsAt, endsAt: new Date(startsAt.getTime() + 7 * 86400000), totalWeeks: 1, configurationVersion: 1 }, snapshot: { games: [], playerPool: pool, checkedAt: '2093-10-19T12:00:00Z' }, demoTarget: 500, outcome: 'STANDARD' }
const profiles = Array.from({ length: 1000 }, (_, i) => ({ userId: `user-${i}`, demoKey: `key-${i}`, strategy: ['BALANCED', 'PITCHING', 'RISKY'][i % 3] }))

describe('recurring demo plan', () => {
    it('reproduces managers, valid lineups, distinct names and entry times', () => {
        const plan = planRecurringDemoEntries(context, profiles, 'recurring-v1', context.publishedAt)
        expect(plan).toEqual(planRecurringDemoEntries(context, profiles, 'recurring-v1', context.publishedAt))
        expect(plan).toHaveLength(500)
        expect(new Set(plan.map(row => row.userId)).size).toBe(500)
        expect(new Set(plan.map(row => row.teamName)).size).toBe(500)
        for (const row of plan) {
            expect(row.scheduledAt.getTime()).toBeGreaterThanOrEqual(context.publishedAt.getTime())
            expect(row.scheduledAt.getTime()).toBeLessThan(startsAt.getTime())
            expect(validateDailyLineup({ teamName: row.teamName, ...row.lineup }, pool, 80000)).toHaveLength(9)
        }
        expect(plan.map(row => row.scheduledAt.getTime())).toEqual(plan.map(row => row.scheduledAt.getTime()).sort((a, b) => a - b))
    })
    it('limits the plan to available profiles and produces different teams in another tournament', () => {
        const a = planRecurringDemoEntries(context, profiles.slice(0, 1), 'recurring-v1', context.publishedAt)
        const b = planRecurringDemoEntries({ ...context, leagueId: 'league-b' }, profiles.slice(0, 1), 'recurring-v1', context.publishedAt)
        expect(a).toHaveLength(1)
        expect(a[0].sourceKey).not.toBe(b[0].sourceKey)
        expect(a[0].teamName).not.toBe(b[0].teamName)
    })
    it('rejects an invalid target instead of endlessly allocating names', () => {
        expect(() => planRecurringDemoEntries({ ...context, demoTarget: 2000 }, profiles, 'recurring-v1', context.publishedAt)).toThrow('Invalid demo target')
        expect(() => planRecurringDemoEntries({ ...context, demoTarget: 399 }, profiles, 'recurring-v1', context.publishedAt)).toThrow('Invalid demo target')
    })
})
