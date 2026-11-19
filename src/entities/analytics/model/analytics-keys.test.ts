import { describe, expect, it } from 'vitest'

import { compareKey, playerAnalyticsKey } from './analytics-keys'

describe('playerAnalyticsKey', () => {
    it('is null while no player is selected, so SWR makes no request', () => {
        expect(playerAnalyticsKey(null)).toBeNull()
    })

    it('identifies the player and the season', () => {
        expect(playerAnalyticsKey(660271)).toEqual(['analytics', 'player', 660271, undefined])
        expect(playerAnalyticsKey(660271, 2025)).toEqual(['analytics', 'player', 660271, 2025])
    })
})

describe('compareKey', () => {
    it('is null until two players are chosen, so nothing is fetched', () => {
        expect(compareKey([])).toBeNull()
        expect(compareKey([1])).toBeNull()
    })

    it('identifies the players in the order given', () => {
        expect(compareKey([1, 2])).toEqual(['analytics', 'compare', '1,2'])
    })
})
