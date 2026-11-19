import { describe, expect, it } from 'vitest'

import { compareQuerySchema, gamePkParamSchema, playerAnalyticsQuerySchema } from './analytics.schema'

describe('compareQuerySchema', () => {
    it('parses 2 to 4 comma-separated ids', () => {
        expect(compareQuerySchema.parse({ ids: '660271,592450' }).ids).toEqual([660271, 592450])
        expect(compareQuerySchema.parse({ ids: '1,2,3,4' }).ids).toHaveLength(4)
    })

    it('rejects a single id', () => {
        expect(compareQuerySchema.safeParse({ ids: '1' }).success).toBe(false)
    })

    it('rejects five ids', () => {
        expect(compareQuerySchema.safeParse({ ids: '1,2,3,4,5' }).success).toBe(false)
    })

    it('rejects non-numeric ids', () => {
        expect(compareQuerySchema.safeParse({ ids: '1,abc' }).success).toBe(false)
    })

    it('treats repeated ids as one player', () => {
        expect(compareQuerySchema.safeParse({ ids: '1,1' }).success).toBe(false)
        expect(compareQuerySchema.parse({ ids: '1,1,2' }).ids).toEqual([1, 2])
    })

    it('rejects a missing ids parameter', () => {
        expect(compareQuerySchema.safeParse({}).success).toBe(false)
    })
})

describe('playerAnalyticsQuerySchema', () => {
    it('accepts an optional season and rejects nonsense', () => {
        expect(playerAnalyticsQuerySchema.parse({}).season).toBeUndefined()
        expect(playerAnalyticsQuerySchema.parse({ season: '2025' }).season).toBe(2025)
        expect(playerAnalyticsQuerySchema.safeParse({ season: 'x' }).success).toBe(false)
    })
})

describe('gamePkParamSchema', () => {
    it('requires a positive integer', () => {
        expect(gamePkParamSchema.parse('777283')).toBe(777283)
        expect(gamePkParamSchema.safeParse('0').success).toBe(false)
        expect(gamePkParamSchema.safeParse('abc').success).toBe(false)
    })
})
