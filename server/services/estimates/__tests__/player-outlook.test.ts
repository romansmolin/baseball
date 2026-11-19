import { describe, expect, it } from 'vitest'

import type { ProviderExpectedStats } from '../../../providers/dto/provider-expected-stats.dto'
import type {
    ProviderGameLogLine,
    ProviderPlayerProfile,
    ProviderStatGroup,
    StatLine,
} from '../../../providers/dto/provider-player-profile.dto'
import { outlookForPlayer } from '../player-outlook'

const player = (position: 'SP' | 'OF' = 'OF') => ({
    id: 1,
    fullName: 'Test Player',
    firstName: 'Test',
    lastName: 'Player',
    primaryPosition: position,
    teamId: 1,
    teamName: 'Team',
    teamAbbreviation: 'TM',
    birthDate: null,
    age: null,
    bats: 'R' as const,
    throws: 'R' as const,
    jerseyNumber: null,
    photoUrl: null,
    active: true,
})

const status = { code: 'A', description: 'Active', available: true }

// A game where a hitter goes `hits`-for-4 with the given total bases.
const game = (hits: number, totalBases: number): ProviderGameLogLine => ({
    date: '2025-06-01',
    opponentTeamId: 2,
    stats: { atBats: 4, hits, baseOnBalls: 0, hitByPitch: 0, sacFlies: 0, totalBases },
})

const hittingGroup = (parts: Partial<ProviderStatGroup> & { season: StatLine | null }): ProviderStatGroup => ({
    sabermetrics: null,
    splits: [],
    gameLog: [],
    ...parts,
})

const profile = (hitting: ProviderStatGroup | null, pitching: ProviderStatGroup | null = null): ProviderPlayerProfile => ({
    player: player(),
    hitting,
    pitching,
    status,
})

const seasonLine = { ops: '.750', plateAppearances: 500 }
// 14 games at 1-for-4 with one total base each: OPS .500, well under the .750 season line.
const coldLog = Array.from({ length: 14 }, () => game(1, 1))
// 14 games at 3-for-4 with six total bases: OPS 2.25.
const hotLog = Array.from({ length: 14 }, () => game(3, 6))
// 14 games at 1-for-4 with two total bases each: OPS .750, exactly the season line.
const averageLog = Array.from({ length: 14 }, () => game(1, 2))

describe('outlookForPlayer', () => {
    it('gives a null score and low confidence when there is nothing to judge', () => {
        const outlook = outlookForPlayer({ profile: profile(null), expected: null, opposingStarterThrows: null })

        expect(outlook.score).toBeNull()
        expect(outlook.confidence).toBe('low')
        expect(outlook.externalPlayerId).toBe(1)
    })

    it('gives a null score for a hitter with zero plate appearances', () => {
        const outlook = outlookForPlayer({
            profile: profile(hittingGroup({ season: { ops: '.000', plateAppearances: 0 } })),
            expected: null,
            opposingStarterThrows: null,
        })

        expect(outlook.score).toBeNull()
    })

    it('scores a hitter off the season OPS: .750 is 50', () => {
        const outlook = outlookForPlayer({
            profile: profile(hittingGroup({ season: seasonLine })),
            expected: null,
            opposingStarterThrows: null,
        })

        expect(outlook.score).toBe(50)
        expect(outlook.confidence).toBe('high')
    })

    it('raises the score for a hot last 14 games and lowers it for a cold stretch', () => {
        const score = (gameLog: ProviderGameLogLine[]) =>
            outlookForPlayer({
                profile: profile(hittingGroup({ season: seasonLine, gameLog })),
                expected: null,
                opposingStarterThrows: null,
            }).score as number

        expect(score(hotLog)).toBeGreaterThan(score(averageLog))
        expect(score(coldLog)).toBeLessThan(score(averageLog))
        expect(score(averageLog)).toBeCloseTo(50, 0)
    })

    it('lowers the score for a left-handed starter when the hitter is weak against lefties', () => {
        const splits = [
            { key: 'vsLeft' as const, stats: { ops: '.600', plateAppearances: 120 } },
            { key: 'vsRight' as const, stats: { ops: '.800', plateAppearances: 380 } },
        ]
        const score = (throws: 'L' | 'R' | null) =>
            outlookForPlayer({
                profile: profile(hittingGroup({ season: seasonLine, splits })),
                expected: null,
                opposingStarterThrows: throws,
            }).score as number

        expect(score('L')).toBeLessThan(score(null))
        expect(score('R')).toBeGreaterThan(score(null))
    })

    it('ignores a platoon split with too few plate appearances', () => {
        const splits = [{ key: 'vsLeft' as const, stats: { ops: '.100', plateAppearances: 8 } }]

        const outlook = outlookForPlayer({
            profile: profile(hittingGroup({ season: seasonLine, splits })),
            expected: null,
            opposingStarterThrows: 'L',
        })

        expect(outlook.score).toBe(50)
        expect(outlook.factors.some((f) => f.key === 'platoon')).toBe(false)
    })

    it('adds expected-stats credit when xwOBA beats the actual wOBA', () => {
        const expected: ProviderExpectedStats = {
            externalPlayerId: 1,
            season: 2025,
            role: 'batter',
            xba: 0.28,
            xslg: 0.5,
            xwoba: 0.38,
            barrelRate: 12,
            hardHitRate: 45,
            sprintSpeed: null,
        }
        const group = hittingGroup({ season: seasonLine, sabermetrics: { woba: '.330' } })

        const withExpected = outlookForPlayer({ profile: profile(group), expected, opposingStarterThrows: null })
        const without = outlookForPlayer({ profile: profile(group), expected: null, opposingStarterThrows: null })

        expect(withExpected.score as number).toBeGreaterThan(without.score as number)
        expect(withExpected.factors.some((f) => f.key === 'expected_stats')).toBe(true)
    })

    it('marks a small sample as low confidence', () => {
        const outlook = outlookForPlayer({
            profile: profile(hittingGroup({ season: { ops: '.900', plateAppearances: 20 } })),
            expected: null,
            opposingStarterThrows: null,
        })

        expect(outlook.confidence).toBe('low')
    })

    it('scores a pitcher off ERA: 3.75 is 50 and lower ERA is better', () => {
        const pitcher = (era: string) =>
            outlookForPlayer({
                profile: {
                    player: player('SP'),
                    hitting: null,
                    pitching: hittingGroup({ season: { era, inningsPitched: '150.1' } }),
                    status,
                },
                expected: null,
                opposingStarterThrows: null,
            })

        expect(pitcher('3.75').score).toBe(50)
        expect(pitcher('2.50').score as number).toBeGreaterThan(pitcher('4.50').score as number)
    })

    it('uses the pitching line for a two-way player who has no plate appearances', () => {
        const outlook = outlookForPlayer({
            profile: {
                player: player('OF'),
                hitting: hittingGroup({ season: { ops: '.000', plateAppearances: 0 } }),
                pitching: hittingGroup({ season: { era: '3.75', inningsPitched: '60.0' } }),
                status,
            },
            expected: null,
            opposingStarterThrows: null,
        })

        expect(outlook.score).toBe(50)
    })

    it('nudges hitters up in hot, wind-out conditions and down in the cold', () => {
        const score = (weather: { condition: string; tempF: number | null; wind: string } | null) =>
            outlookForPlayer({
                profile: profile(hittingGroup({ season: seasonLine })),
                expected: null,
                opposingStarterThrows: null,
                weather,
            }).score as number

        expect(score({ condition: 'Sunny', tempF: 90, wind: '10 mph, Out To RF' })).toBeGreaterThan(score(null))
        expect(score({ condition: 'Cloudy', tempF: 42, wind: '8 mph, In From CF' })).toBeLessThan(score(null))
    })
})
