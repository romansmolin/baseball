import { describe, expect, it } from 'vitest'

import { mapProjectionsToModel } from './mappers'

describe('mapProjectionsToModel', () => {
    it('keys projections by numeric player id and keeps null points as null', () => {
        const model = mapProjectionsToModel({
            basis: 'season-pace',
            projections: {
                '660271': { points: 24.7, games: 6, starts: 0, confidence: 'normal', basis: 'season-pace' },
                '12': { points: null, games: 0, starts: 0, confidence: 'normal', basis: 'season-pace', reason: 'NO_STATS' },
            },
        })

        expect(model.basis).toBe('season-pace')
        expect(model.projections.get(660271)?.points).toBe(24.7)
        expect(model.projections.get(12)).toMatchObject({ points: null, reason: 'NO_STATS' })
    })
})
