import { describe, expect, it } from 'vitest'

import { getPlayersPageRange, updatePlayersQuery } from './player-query-state'

describe('player query pagination', () => {
    it('limits each requested page to ten players', () => {
        const query = updatePlayersQuery({
            league: 'mlb',
            search: '',
            position: 'all',
            status: 'all',
            offset: 20,
            limit: 10,
        }, { offset: 30 })

        expect(query.limit).toBe(10)
        expect(query.offset).toBe(30)
    })

    it('resets to the first page when a directory filter changes', () => {
        const query = updatePlayersQuery({
            league: 'mlb',
            search: 'judge',
            position: 'all',
            status: 'all',
            offset: 20,
            limit: 10,
        }, { search: 'ohtani' })

        expect(query).toMatchObject({ search: 'ohtani', offset: 0 })
    })

    it('formats the range for a paginated result set', () => {
        expect(getPlayersPageRange(10, 28)).toBe('11–20 of 28')
        expect(getPlayersPageRange(0, 0)).toBe('0 players')
    })
})
