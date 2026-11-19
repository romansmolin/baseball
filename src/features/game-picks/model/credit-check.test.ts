import { describe, expect, it } from 'vitest'

import { checkCredits } from './credit-check'

describe('checkCredits', () => {
    it('allows the call when the balance covers the cost', () => {
        expect(checkCredits(100, 20)).toEqual({ canAfford: true, shortBy: 0 })
        expect(checkCredits(20, 20)).toEqual({ canAfford: true, shortBy: 0 })
    })

    it('blocks the call and says how many credits are missing', () => {
        expect(checkCredits(5, 20)).toEqual({ canAfford: false, shortBy: 15 })
    })

    it('blocks the call while the balance is still unknown', () => {
        expect(checkCredits(undefined, 20)).toEqual({ canAfford: false, shortBy: 20 })
    })
})
