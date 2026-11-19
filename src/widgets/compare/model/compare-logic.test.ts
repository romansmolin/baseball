import { describe, expect, it } from 'vitest'

import {
    MAX_COMPARE_PLAYERS,
    addCompareId,
    bestIndexes,
    parseCompareIds,
    removeCompareId,
} from './compare-logic'

describe('parseCompareIds', () => {
    it('reads a comma separated list, dropping junk and duplicates', () => {
        expect(parseCompareIds('660271, 592450,abc,660271,-4,0')).toEqual([660271, 592450])
    })

    it('is empty for a missing or empty parameter', () => {
        expect(parseCompareIds(null)).toEqual([])
        expect(parseCompareIds('')).toEqual([])
    })

    it('keeps at most four players', () => {
        expect(parseCompareIds('1,2,3,4,5,6')).toEqual([1, 2, 3, 4])
    })
})

describe('addCompareId', () => {
    it('appends a new player', () => {
        expect(addCompareId([1], 2)).toEqual([1, 2])
    })

    it('ignores a fifth player', () => {
        const four = [1, 2, 3, 4]
        expect(four).toHaveLength(MAX_COMPARE_PLAYERS)
        expect(addCompareId(four, 5)).toEqual(four)
    })

    it('ignores a player who is already selected', () => {
        expect(addCompareId([1, 2], 2)).toEqual([1, 2])
    })
})

describe('removeCompareId', () => {
    it('removes one player and keeps the order of the rest', () => {
        expect(removeCompareId([1, 2, 3], 2)).toEqual([1, 3])
    })
})

describe('bestIndexes', () => {
    it('picks the highest value when higher is better', () => {
        expect(bestIndexes([0.7, 0.9, 0.8], 'higher')).toEqual(new Set([1]))
    })

    it('picks the lowest value when lower is better', () => {
        expect(bestIndexes([3.1, 2.4, 4], 'lower')).toEqual(new Set([1]))
    })

    it('never marks a missing value as best', () => {
        expect(bestIndexes([null, 0.5, 0.4], 'higher')).toEqual(new Set([1]))
        expect(bestIndexes([null, 0.5, 0.4], 'lower')).toEqual(new Set([2]))
        expect(bestIndexes([null, null], 'higher')).toEqual(new Set())
    })

    it('marks every player tied for best, but nobody when only one has a value', () => {
        expect(bestIndexes([0.8, 0.8, 0.5], 'higher')).toEqual(new Set([0, 1]))
        expect(bestIndexes([0.8], 'higher')).toEqual(new Set())
    })
})
