import { describe, expect, it } from 'vitest'

import { playerAnalyticsKey } from './analytics-keys'

describe('playerAnalyticsKey', () => {
    it('is null while no player is selected, so SWR makes no request', () => {
        expect(playerAnalyticsKey(null)).toBeNull()
    })

    it('identifies the player and the season', () => {
        expect(playerAnalyticsKey(660271)).toEqual(['analytics', 'player', 660271, undefined])
        expect(playerAnalyticsKey(660271, 2025)).toEqual(['analytics', 'player', 660271, 2025])
    })
})
