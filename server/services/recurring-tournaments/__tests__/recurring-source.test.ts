import { afterEach, describe, expect, it, vi } from 'vitest'
import { inspectRecurringSource } from '../recurring-source.service'
import { FixtureProvider, game } from './fixtures'
import type { RecurringWindow } from '../recurring.types'

const window: RecurringWindow = { templateKey: 'weekly-sprint', sourceSlug: 'winter-leagues', startsAt: new Date('2091-11-05T12:00:00Z'), endsAt: new Date('2091-11-12T12:00:00Z'), totalWeeks: 1, configurationVersion: 1 }
afterEach(() => vi.useRealTimers())

describe('recurring baseball source inspection', () => {
    it('deduplicates seasons and games across New Year but keeps doubleheaders', async () => {
        const provider = new FixtureProvider()
        provider.games = [{ ...game, gameDateUtc: '2026-12-31T20:00:00Z' }, { ...game, gamePk: game.gamePk + 1, doubleHeader: true, gameDateUtc: '2026-12-31T23:00:00Z' }, { ...game, gamePk: game.gamePk + 2, gameDateUtc: '2027-01-07T20:00:00Z' }]
        const result = await inspectRecurringSource(provider, { ...window, templateKey: 'diamond-cup', startsAt: new Date('2026-12-30T12:00:00Z'), endsAt: new Date('2027-01-13T12:00:00Z'), totalWeeks: 2 }, { historical: false })
        expect(provider.seasons).toEqual(new Set([2027, 2026, 2025]))
        expect(result.ok).toBe(true)
        if (!result.ok) throw new Error('Source must be publishable')
        expect(result.snapshot.games.map(g => [g.gamePk, g.week, g.apiSeason])).toEqual([[1934000001, 1, 2027], [1934000002, 1, 2027], [1934000003, 2, 2027]])
    })

    it('excludes unavailable team games while keeping the valid slate', async () => {
        const provider = new FixtureProvider(); provider.unavailableTeam = 3
        provider.games = [{ ...game, gamePk: 1934000000, homeTeamId: 3 }, game]
        const result = await inspectRecurringSource(provider, window, { historical: false })
        expect(result.ok).toBe(true)
        if (!result.ok) throw new Error('Expected remaining valid game')
        expect(result.snapshot.games.map(g => g.gamePk)).toEqual([1934000001])
        expect(result.snapshot.playerPool.some(p => p.teamId === 3)).toBe(false)
    })

    it('does not publish a long tournament with an empty week', async () => {
        expect(await inspectRecurringSource(new FixtureProvider(), { ...window, endsAt: new Date('2091-11-19T12:00:00Z'), totalWeeks: 2 }, { historical: false })).toMatchObject({ ok: false, reason: 'EMPTY_WEEK' })
    })

    it('rejects a pool that cannot fill nine positions', async () => {
        const provider = new FixtureProvider()
        const original = provider.getPlayersByTeam.bind(provider)
        provider.getPlayersByTeam = async id => (await original(id)).filter(p => p.primaryPosition === 'SP')
        expect(await inspectRecurringSource(provider, window, { historical: false })).toMatchObject({ ok: false, reason: 'INVALID_POOL' })
    })

    it('takes historical teams from the game roster rather than current transfers', async () => {
        const provider = new FixtureProvider(); provider.games = [{ ...game, status: 'FINAL' }]
        provider.getPlayersByTeam = async () => { throw new Error('Current rosters must not be used for a historical game') }
        const result = await inspectRecurringSource(provider, window, { historical: true })
        expect(result.ok).toBe(true)
        if (!result.ok) throw new Error('Expected verified historical day')
        expect(result.snapshot.playerPool.find(p => p.externalPlayerId === 2)?.teamName).toBe('Original Club')
    })

    it('resumes a partial roster inspection without rereading the completed team', async () => {
        vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2091-11-01T10:00:00Z'))
        const provider = new FixtureProvider()
        provider.afterRosterRead = () => vi.setSystemTime(Date.now() + 1000)
        const partial = await inspectRecurringSource(provider, window, { historical: false, deadline: Date.now() + 1500 })
        expect(partial).toMatchObject({ ok: false, reason: 'INCOMPLETE_BATCH' })
        if (partial.ok || partial.reason !== 'INCOMPLETE_BATCH') throw new Error('Expected a saved checkpoint')
        expect(provider.rosterReads).toBe(1)
        const complete = await inspectRecurringSource(provider, window, { historical: false, checkpoint: partial.checkpoint, deadline: Date.now() + 10000 })
        expect(complete.ok).toBe(true)
        expect(provider.rosterReads).toBe(2)
    })

    it('reports source failure without inventing a new empty schedule', async () => {
        const provider = new FixtureProvider(); provider.getSchedule = async () => { throw new Error('Offline') }
        expect(await inspectRecurringSource(provider, window, { historical: false })).toMatchObject({ ok: false, reason: 'SOURCE_UNAVAILABLE' })
    })
})
