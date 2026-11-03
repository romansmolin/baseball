import { describe, expect, it, vi } from 'vitest'
import { loadDailySchedule } from './daily-schedule.service'
import type { ISportsProvider } from '../../providers/sports-provider.interface'

const game = (gamePk: number) => ({ gamePk, gameDateUtc: '2027-01-05T23:00:00Z', homeTeamId: 1, awayTeamId: 2, status: 'SCHEDULED' as const, doubleHeader: false, homeScore: null, awayScore: null })

describe('loadDailySchedule', () => {
    it('finds January winter games using the previous source season', async () => {
        const getSchedule = vi.fn(async ({ season }: { season?: number }) => season === 2026 ? [game(17)] : [])
        const result = await loadDailySchedule({ getSchedule } as unknown as ISportsProvider, { league: 'winter-leagues', startDateUtc: new Date('2027-01-05T00:00:00Z'), endDateUtc: new Date('2027-01-07T00:00:00Z') })
        expect(result).toEqual([{ game: game(17), apiSeason: 2026, sourceLeagueSlug: 'winter-leagues' }])
        expect(getSchedule.mock.calls.map(call => call[0].season)).toEqual([2027, 2026])
    })

    it('deduplicates a game returned by adjacent API seasons', async () => {
        const result = await loadDailySchedule({ getSchedule: vi.fn(async () => [game(17)]) } as unknown as ISportsProvider, { league: 'winter-leagues', startDateUtc: new Date('2027-01-05T00:00:00Z'), endDateUtc: new Date('2027-01-07T00:00:00Z') })
        expect(result).toHaveLength(1)
        expect(result[0].game.gamePk).toBe(17)
    })

    it('keeps the single-season request for the regular MLB calendar', async () => {
        const getSchedule = vi.fn(async () => [])
        await loadDailySchedule({ getSchedule } as unknown as ISportsProvider, { league: 'mlb', startDateUtc: new Date('2026-07-01T00:00:00Z'), endDateUtc: new Date('2026-07-03T00:00:00Z') })
        expect(getSchedule).toHaveBeenCalledTimes(1)
    })
})
