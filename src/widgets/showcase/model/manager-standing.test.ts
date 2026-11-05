import { describe, expect, it } from 'vitest'
import { averagePoints, countryLabel, formSeries, podiumOrder, rankMove } from './manager-standing'

describe('manager standing', () => {
    it('reports rank movement and average points', () => {
        expect(rankMove({ rank: 4, previousRank: 7 })).toEqual({ direction: 'up', by: 3 })
        expect(rankMove({ rank: 9, previousRank: 7 })).toEqual({ direction: 'down', by: 2 })
        expect(rankMove({ rank: 7, previousRank: 7 })).toBeNull()
        expect(rankMove({ rank: 7, previousRank: null })).toBeNull()
        expect(averagePoints({ points: 90, entries: 3 })).toBe(30)
        expect(averagePoints({ points: 0, entries: 0 })).toBe(0)
    })

    it('labels countries and ignores unknown codes', () => {
        expect(countryLabel('us')).toBe('🇺🇸 United States')
        expect(countryLabel(null)).toBeNull()
        expect(countryLabel('Baseball')).toBeNull()
    })

    it('puts the winner in the middle only for a full podium', () => {
        expect(podiumOrder(['a', 'b', 'c', 'd']).map(row => [row.item, row.place])).toEqual([['b', 2], ['a', 1], ['c', 3]])
        expect(podiumOrder(['a', 'b']).map(row => row.place)).toEqual([1, 2])
    })

    it('orders form oldest first with best and average', () => {
        const entry = (entryId: string, points: number) => ({ entryId, points, contest: { name: entryId, contestDate: '2026-10-01' } })
        const form = formSeries([entry('new', 40), entry('old', 20)])
        expect(form.series.map(row => row.entryId)).toEqual(['old', 'new'])
        expect([form.best, form.average]).toEqual([40, 30])
    })
})
