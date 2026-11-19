import { describe, expect, it } from 'vitest'

import { mapProjectionsToModel } from './mappers'

describe('mapProjectionsToModel', () => {
    it('keys projections by numeric player id and keeps null points as null', () => {
        const model = mapProjectionsToModel({
            basis: 'season-pace',
            scales: {},
            projections: {
                '660271': { points: 24.7, games: 6, starts: 0, confidence: 'normal', basis: 'season-pace' },
                '12': { points: null, games: 0, starts: 0, confidence: 'normal', basis: 'season-pace', reason: 'NO_STATS' },
            },
        })

        expect(model.basis).toBe('season-pace')
        expect(model.projections.get(660271)?.points).toBe(24.7)
        expect(model.projections.get(12)).toMatchObject({ points: null, reason: 'NO_STATS' })
    })

    it('carries category stats and scales through', () => {
        const stats = { side: 'hitting', r: 3, hr: 1, rbi: 3, sb: 0.5, ab: 24, h: 7, w: 0, sv: 0, k: 0, ip: 0, er: 0, bbh: 0 } as const
        const model = mapProjectionsToModel({
            basis: 'schedule',
            scales: { HR: { mean: 1, sd: 0.5 } },
            projections: { '1': { points: 10, games: 6, starts: 0, confidence: 'normal', basis: 'schedule', stats } },
        })

        expect(model.projections.get(1)?.stats).toEqual(stats)
        expect(model.scales.HR).toEqual({ mean: 1, sd: 0.5 })
    })
})
