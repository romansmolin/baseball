import { describe, expect, it } from 'vitest'

import {
    BASEBALL_LEAGUES,
    BASEBALL_LEAGUE_SLUGS,
    DEFAULT_BASEBALL_LEAGUE,
    getBaseballLeague,
    isSupportedBaseballLeague,
} from '../league'

describe('baseball league catalogue', () => {
    it('exposes the six supported leagues', () => {
        expect([...BASEBALL_LEAGUE_SLUGS]).toEqual([
            'mlb',
            'triple-a',
            'double-a',
            'high-a',
            'single-a',
            'rookie',
        ])
    })

    it('defaults to MLB', () => {
        expect(DEFAULT_BASEBALL_LEAGUE).toBe('mlb')
        expect(BASEBALL_LEAGUES[0].slug).toBe('mlb')
    })

    it('recognises supported slugs and rejects everything else', () => {
        expect(isSupportedBaseballLeague('triple-a')).toBe(true)
        expect(isSupportedBaseballLeague('mlb')).toBe(true)
        expect(isSupportedBaseballLeague('npb')).toBe(false)
        expect(isSupportedBaseballLeague('kbo')).toBe(false)
        expect(isSupportedBaseballLeague(undefined)).toBe(false)
        expect(isSupportedBaseballLeague(null)).toBe(false)
    })

    it('looks up a league config by slug', () => {
        expect(getBaseballLeague('double-a')?.shortName).toBe('AA')
        expect(getBaseballLeague('nope')).toBeUndefined()
    })

    it('gives every league a distinct slug', () => {
        const slugs = BASEBALL_LEAGUES.map((l) => l.slug)
        expect(new Set(slugs).size).toBe(slugs.length)
    })
})
