import { describe, expect, it } from 'vitest'

import type { ProviderPlayer } from '../../../providers/dto/provider-player.dto'
import type { ProviderTeamStanding } from '../../../providers/dto/provider-team-standing.dto'
import { starterStrengthFrom, teamStrengthFor } from '../estimate-inputs'

const standing = (overrides: Partial<ProviderTeamStanding> = {}): ProviderTeamStanding => ({
    teamId: 1,
    wins: 60,
    losses: 40,
    lastTen: { wins: 8, losses: 2 },
    ...overrides,
})

describe('teamStrengthFor', () => {
    it('uses the standings record and last ten games', () => {
        const strength = teamStrengthFor(1, new Map([[1, standing()]]), null)

        expect(strength).toEqual({ winPct: 0.6, last10WinPct: 0.8 })
    })

    it('uses the last ten as the season rate when it is missing', () => {
        const strength = teamStrengthFor(1, new Map([[1, standing({ lastTen: null })]]), null)

        expect(strength).toEqual({ winPct: 0.6, last10WinPct: 0.6 })
    })

    it('falls back to the schedule record when the standings have no row for the team', () => {
        const strength = teamStrengthFor(9, new Map(), { wins: 3, losses: 1 })

        expect(strength).toEqual({ winPct: 0.75, last10WinPct: 0.75 })
    })

    it('is a coin flip before any game has been played', () => {
        expect(teamStrengthFor(9, new Map(), null)).toEqual({ winPct: 0.5, last10WinPct: 0.5 })
        expect(teamStrengthFor(1, new Map([[1, standing({ wins: 0, losses: 0, lastTen: null })]]), null)).toEqual({
            winPct: 0.5,
            last10WinPct: 0.5,
        })
    })
})

const pitcher = (pitchingStats?: Record<string, string | number>): ProviderPlayer => ({
    id: 5,
    fullName: 'P',
    firstName: 'P',
    lastName: 'P',
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
    pitchingStats,
})

describe('starterStrengthFrom', () => {
    it('reads ERA and innings from the season line', () => {
        expect(starterStrengthFrom(pitcher({ era: '3.12', inningsPitched: '120.1' }))).toEqual({
            era: 3.12,
            inningsPitched: 120 + 1 / 3,
        })
    })

    it('is null without a pitcher, without stats, or with a placeholder ERA', () => {
        expect(starterStrengthFrom(null)).toBeNull()
        expect(starterStrengthFrom(pitcher())).toBeNull()
        expect(starterStrengthFrom(pitcher({ era: '-.--', inningsPitched: '0.0' }))).toBeNull()
    })
})
