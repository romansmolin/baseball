import { describe, expect, it } from 'vitest'
import { evaluateRecurringWeek, rankRecurringTotals, scoreRecurringSlots } from '../recurring-lifecycle'
import { box, game } from './fixtures'
import { scoringRules } from './test-db'
import type { RecurringGame } from '../recurring.types'

const start = '2026-11-01T12:00:00Z'
const end = new Date('2026-11-08T12:00:00Z')
const now = new Date('2026-11-09T12:00:00Z')
const scheduled: RecurringGame = { ...game, gameDateUtc: start, originalStartUtc: start, apiSeason: 2026, week: 1, homeTeamName: 'Home', awayTeamName: 'Away' }

describe('recurring weekly scoring', () => {
    it('keeps a final game with missing statistics preliminary', () => {
        const result = evaluateRecurringWeek([scheduled], [{ gamePk: scheduled.gamePk, status: 'FINAL', complete: false, boxScore: null }], end, now)
        expect(result.state).toBe('PARTIAL')
        expect(result.pendingGamePks).toEqual([scheduled.gamePk])
    })

    it('preserves available partial statistics while the source is incomplete', () => {
        const live = { ...box, status: 'LIVE' as const }
        const result = evaluateRecurringWeek([scheduled], [{ gamePk: scheduled.gamePk, status: 'FINAL', complete: false, boxScore: live }], end, now)
        expect(result.state).toBe('PARTIAL')
        expect(result.boxes).toEqual([live])
    })

    it('does not finalize a box score missing a side of the statistics', () => {
        const incomplete = { ...box, batters: [] }
        const result = evaluateRecurringWeek([scheduled], [{ gamePk: scheduled.gamePk, status: 'FINAL', complete: true, boxScore: incomplete }], end, now)
        expect(result.state).toBe('PARTIAL')
        expect(result.pendingGamePks).toEqual([scheduled.gamePk])
    })

    it('excludes postponed unplayed games after 72 hours and voids an empty week', () => {
        const result = evaluateRecurringWeek([scheduled], [{ gamePk: scheduled.gamePk, status: 'POSTPONED', complete: false, boxScore: null }], end, now)
        expect(result.state).toBe('FINAL')
        expect(result.outcome).toBe('VOID')
        expect(result.exclusions).toEqual([{ gamePk: scheduled.gamePk, reason: 'POSTPONED_TIMEOUT' }])
    })

    it('keeps a postponed game pending before the grace period expires', () => {
        const result = evaluateRecurringWeek([scheduled], [{ gamePk: scheduled.gamePk, status: 'POSTPONED', complete: false, boxScore: null }], end, new Date('2026-11-02T12:00:00Z'))
        expect(result.state).toBe('PARTIAL')
        expect(result.pendingGamePks).toEqual([scheduled.gamePk])
    })

    it('excludes cancelled games and scores completed games only in their original week', () => {
        const other = { ...scheduled, gamePk: scheduled.gamePk + 1 }
        const result = evaluateRecurringWeek([scheduled, other], [{ gamePk: scheduled.gamePk, status: 'CANCELLED', complete: false, boxScore: null }, { gamePk: other.gamePk, status: 'FINAL', complete: true, boxScore: { ...box, gamePk: other.gamePk } }], end, now)
        expect(result.state).toBe('FINAL')
        expect(result.outcome).toBe('STANDARD')
        expect(result.boxes.map(row => row.gamePk)).toEqual([other.gamePk])
        expect(result.exclusions).toEqual([{ gamePk: scheduled.gamePk, reason: 'CANCELLED' }])
    })

    it('adds batting and pitching across games before applying the captain multiplier', () => {
        const dual = { ...box, batters: box.batters.map(b => ({ ...b, externalPlayerId: 1 })) }
        const result = scoreRecurringSlots([{ externalPlayerId: 1, playerName: 'Two-way player', slotPosition: 'P' }], 1, [dual, { ...dual, gamePk: dual.gamePk + 1 }], scoringRules)
        expect(result.points).toBe(156)
        expect(result.slots[0]).toMatchObject({ rawPoints: 104, finalPoints: 156, isCaptain: true })
    })
    it('shares ranks for equal points with a stable user order', () => {
        const ranked = rankRecurringTotals([{ userId: 'b', points: 10 }, { userId: 'a', points: 10 }, { userId: 'c', points: 9 }])
        expect(ranked.map(row => [row.userId, row.rank])).toEqual([['a', 1], ['b', 1], ['c', 3]])
    })
})
