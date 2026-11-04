import { describe, expect, it } from 'vitest'

import type { ISportsProvider } from '../../providers/sports-provider.interface'
import { loadMinorReplayDay, minorReplayCandidates } from './minor-replay-history'

describe('minor replay days', () => {
    it('lists candidate days newest first, starting yesterday', () => {
        expect(minorReplayCandidates(new Date('2026-11-04T10:00:00Z'), 3)).toEqual(['2026-11-03', '2026-11-02', '2026-11-01'])
    })

    it('skips a day without enough finished games', async () => {
        const provider = { getGameRoster: async () => null, getSchedule: async () => [], getTeams: async () => [] } as unknown as ISportsProvider
        expect(await loadMinorReplayDay(provider, '2026-11-03')).toBeNull()
    })
})
