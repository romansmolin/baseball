import { describe, expect, it } from 'vitest'

import type { ISportsProvider } from '../../providers/sports-provider.interface'
import { loadContestSourceSchedule } from './daily-schedule.service'

function recordingProvider() {
    const leagues: (string | undefined)[] = []
    const provider = { getSchedule: async (filters: { league?: string }) => { leagues.push(filters.league); return [] } } as unknown as ISportsProvider
    return { provider, leagues }
}
const range = { startDateUtc: new Date('2026-07-08T00:00:00Z'), endDateUtc: new Date('2026-07-09T00:00:00Z') }

describe('loadContestSourceSchedule', () => {
    it('reads the Minor Leagues levels for the minor source', async () => {
        const { provider, leagues } = recordingProvider()
        await loadContestSourceSchedule(provider, 'minor-leagues', range)
        expect(new Set(leagues)).toEqual(new Set(['high-a', 'single-a', 'rookie']))
    })

    it('reads the combined winter feed for a single winter league', async () => {
        const { provider, leagues } = recordingProvider()
        await loadContestSourceSchedule(provider, 'winter-lvbp', range)
        expect(new Set(leagues)).toEqual(new Set(['winter-leagues']))
    })
})
