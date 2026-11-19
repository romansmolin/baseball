import { describe, expect, it } from 'vitest'

import type { ProviderPlayer } from '../../dto/provider-player.dto'
import { mapMlbScheduleGameToContext } from '../mappers/mlb-game-context.mapper'
import type { MlbRawScheduleResponse } from '../types/mlb-schedule.raw'

import schedule from './fixtures/schedule-contexts.json'

const [withData, withoutData] = (schedule as unknown as MlbRawScheduleResponse).dates[0].games

const pitcher = (id: number, name: string): ProviderPlayer => ({
    id,
    fullName: name,
    firstName: name,
    lastName: name,
    primaryPosition: 'SP',
    teamId: null,
    teamName: null,
    teamAbbreviation: null,
    birthDate: null,
    age: null,
    bats: null,
    throws: 'R',
    jerseyNumber: null,
    photoUrl: null,
    active: true,
})

describe('mapMlbScheduleGameToContext', () => {
    it('maps venue, weather, probable pitchers, records and posted lineups', () => {
        const pitchers = new Map([[592332, pitcher(592332, 'Kevin Gausman')]])

        const ctx = mapMlbScheduleGameToContext(withData, pitchers)

        expect(ctx.game.gamePk).toBe(777283)
        expect(ctx.venue).toEqual({ id: 14, name: 'Rogers Centre' })
        expect(ctx.weather).toEqual({ condition: 'Sunny', tempF: 77, wind: '9 mph, Out To RF' })
        expect(ctx.probablePitchers.home?.fullName).toBe('Kevin Gausman')
        expect(ctx.records.home).toEqual({ wins: 47, losses: 38 })
        expect(ctx.lineupsPosted).toBe(true)
    })

    it('gives null weather, null pitchers and lineupsPosted false when upstream has none', () => {
        const ctx = mapMlbScheduleGameToContext(withoutData, new Map())

        expect(ctx.weather).toBeNull()
        expect(ctx.probablePitchers).toEqual({ home: null, away: null })
        expect(ctx.lineupsPosted).toBe(false)
    })

    it('gives a null temperature when the upstream temperature is not a number', () => {
        const odd = {
            ...withData,
            weather: { condition: 'Dome', temp: '', wind: 'None' },
        }

        const ctx = mapMlbScheduleGameToContext(odd, new Map())

        expect(ctx.weather?.tempF).toBeNull()
    })

    it('does not count lineups as posted until both teams have posted', () => {
        const oneSided = { ...withData, lineups: { homePlayers: [{ id: 1 }], awayPlayers: [] } }

        expect(mapMlbScheduleGameToContext(oneSided, new Map()).lineupsPosted).toBe(false)
    })
})
