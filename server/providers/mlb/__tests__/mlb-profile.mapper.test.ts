import { describe, expect, it } from 'vitest'

import { mapMlbPersonToProfile } from '../mappers/mlb-profile.mapper'
import type { MlbRawPeopleResponse } from '../types/mlb-person.raw'

import noStats from './fixtures/no-stats-person.json'
import ohtani from './fixtures/ohtani-2025-profile.json'

const ohtaniRaw = (ohtani as unknown as MlbRawPeopleResponse).people[0]
const noStatsRaw = (noStats as unknown as MlbRawPeopleResponse).people[0]

describe('mapMlbPersonToProfile', () => {
    it('maps vl/vr/h/a splits to named keys', () => {
        const profile = mapMlbPersonToProfile(ohtaniRaw)

        const keys = profile.hitting?.splits.map((s) => s.key).sort()
        expect(keys).toEqual(['away', 'home', 'vsLeft', 'vsRight'])
    })

    it('returns both hitting and pitching groups for a two-way player', () => {
        const profile = mapMlbPersonToProfile(ohtaniRaw)

        expect(profile.hitting).not.toBeNull()
        expect(profile.pitching).not.toBeNull()
        expect(profile.hitting?.season).toHaveProperty('homeRuns')
        expect(profile.pitching?.season).toHaveProperty('strikeOuts')
        expect(profile.pitching?.sabermetrics).toHaveProperty('fip')
        expect(profile.hitting?.sabermetrics).toHaveProperty('woba')
    })

    it('maps game log lines with date and opponent', () => {
        const profile = mapMlbPersonToProfile(ohtaniRaw)

        const first = profile.hitting?.gameLog[0]
        expect(first?.date).toBe('2025-03-18')
        expect(first?.opponentTeamId).toBe(112)
        expect(profile.hitting?.gameLog).toHaveLength(3)
    })

    it('gives null groups, not zeros, for a player without stats', () => {
        const profile = mapMlbPersonToProfile(noStatsRaw)

        expect(profile.hitting).toBeNull()
        expect(profile.pitching).toBeNull()
        expect(profile.player.id).toBe(999999)
    })

    it('reports availability from the most recent roster entry', () => {
        const profile = mapMlbPersonToProfile(ohtaniRaw)

        expect(profile.status).toEqual({ code: 'A', description: 'Active', available: true })
    })

    it('treats a player with no roster entries as unavailable', () => {
        const profile = mapMlbPersonToProfile(noStatsRaw)

        expect(profile.status).toEqual({
            code: 'NA',
            description: 'No roster status',
            available: false,
        })
    })
})
