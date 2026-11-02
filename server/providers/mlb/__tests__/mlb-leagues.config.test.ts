import { describe, expect, it } from 'vitest'

import { BASEBALL_LEAGUE_SLUGS } from '../../../../src/shared/baseball'
import { BOX_SCORE_SUPPORT, resolveSportId, sportIdFor } from '../mlb-leagues.config'

describe('mlb-leagues.config', () => {
    it('maps every supported league slug to its MLB Stats API sportId', () => {
        expect(sportIdFor('mlb')).toBe(1)
        expect(sportIdFor('triple-a')).toBe(11)
        expect(sportIdFor('double-a')).toBe(12)
        expect(sportIdFor('high-a')).toBe(13)
        expect(sportIdFor('single-a')).toBe(14)
        expect(sportIdFor('rookie')).toBe(16)
    })

    it('maps the Winter Leagues product league to the same baseball feed', async () => {
        const { isSupportedBaseballLeague } = await import('../../../../src/shared/baseball')

        expect(sportIdFor('winter-leagues')).toBe(17)
        expect(BOX_SCORE_SUPPORT['winter-leagues']).toBe('full')
        expect(isSupportedBaseballLeague('winter-leagues')).toBe(true)
    })

    it('resolves an absent league to MLB (sportId 1)', () => {
        expect(resolveSportId()).toBe(1)
        expect(resolveSportId(undefined)).toBe(1)
        expect(resolveSportId(null)).toBe(1)
    })

    it('covers every league slug in the canonical catalogue', () => {
        for (const slug of BASEBALL_LEAGUE_SLUGS) {
            expect(typeof sportIdFor(slug)).toBe('number')
            expect(['full', 'partial']).toContain(BOX_SCORE_SUPPORT[slug])
        }
    })
})
