import { describe, expect, it } from 'vitest'

import { DEFAULT_SCORING_RULES } from '@/shared/team-builder'

import type { ProviderPlayer } from '../../../providers/dto/provider-player.dto'
import { projectPlayerPoints } from '../project-points'

const base = { teamGames: 6, basis: 'schedule' as const, teamSeasonGames: 100, rules: DEFAULT_SCORING_RULES }

const hitter = (overrides: Partial<ProviderPlayer> = {}): ProviderPlayer =>
    ({
        id: 1,
        primaryPosition: 'SS',
        active: true,
        battingStats: {
            gamesPlayed: 100, plateAppearances: 450, atBats: 400, hits: 150, doubles: 30, triples: 3, homeRuns: 20,
            runs: 60, rbi: 70, baseOnBalls: 50, hitByPitch: 5, stolenBases: 10, strikeOuts: 80,
        },
        ...overrides,
    }) as unknown as ProviderPlayer

const starter = (): ProviderPlayer =>
    ({
        id: 2,
        primaryPosition: 'SP',
        active: true,
        pitchingStats: {
            gamesPlayed: 30, gamesStarted: 30, inningsPitched: '180.0', strikeOuts: 200,
            earnedRuns: 60, hits: 150, baseOnBalls: 50, wins: 12, saves: 0,
        },
    }) as unknown as ProviderPlayer

describe('projectPlayerPoints', () => {
    it('hitter: per-game rates times expected games', () => {
        // season = 97 + 60 + 9 + 80 + 60 + 70 + 50 + 5 + 20 - 40 = 411 over 100 games
        const result = projectPlayerPoints({ ...base, player: hitter() })

        expect(result.points).toBeCloseTo(6 * 4.11, 1)
        expect(result.confidence).toBe('normal')
    })

    it('hitter: category stats use the same expected games', () => {
        const result = projectPlayerPoints({ ...base, player: hitter() })

        expect(result.stats).toMatchObject({ side: 'hitting' })
        expect(result.stats?.hr).toBeCloseTo(1.2, 2) // 20 HR over 100 games, 6 games
        expect(result.stats?.sb).toBeCloseTo(0.6, 2)
        expect(result.stats?.ab).toBeGreaterThan(0)
    })

    it('starter: category stats scale with starts; no stats means no stats object', () => {
        const result = projectPlayerPoints({ ...base, announcedStarts: 2, player: starter() })

        expect(result.stats).toMatchObject({ side: 'pitching' })
        expect(result.stats?.k).toBeCloseTo(2 * (200 / 30), 2)
        expect(result.stats?.ip).toBeCloseTo(12, 2) // 2 starts of 6 innings
        expect(result.stats?.bbh).toBeCloseTo(2 * ((150 + 50) / 30), 2)
        expect(projectPlayerPoints({ ...base, player: hitter({ battingStats: {} }) }).stats).toBeUndefined()
    })

    it('hitter: scales by the share of team games the player appeared in', () => {
        const result = projectPlayerPoints({ ...base, teamSeasonGames: 200, player: hitter() })

        expect(result.games).toBeCloseTo(3, 1)
    })

    it('starter: announced starts override the rotation estimate', () => {
        // 580 points over 30 starts = 19.33 per start
        const announced = projectPlayerPoints({ ...base, announcedStarts: 2, player: starter() })
        const rotation = projectPlayerPoints({ ...base, player: starter() })

        expect(announced.starts).toBe(2)
        expect(announced.points).toBeCloseTo(2 * (580 / 30), 1)
        expect(rotation.starts).toBeCloseTo(1.2, 1)
    })

    it('starter: announced starts add to the rotation share of games with no announcement', () => {
        const mixed = projectPlayerPoints({ ...base, announcedStarts: 1, unannouncedTeamGames: 5, player: starter() })
        const dayWithOtherStarterKnown = projectPlayerPoints({ ...base, teamGames: 1, unannouncedTeamGames: 0, player: starter() })

        expect(mixed.starts).toBe(2) // 1 announced + 5 / 5
        expect(dayWithOtherStarterKnown.starts).toBe(0)
    })

    it('reliever: appearances scale by availability', () => {
        const reliever = {
            id: 3, primaryPosition: 'RP', active: true,
            pitchingStats: {
                gamesPlayed: 60, gamesStarted: 0, inningsPitched: '60.0', strikeOuts: 70,
                earnedRuns: 20, hits: 50, baseOnBalls: 20, wins: 4, saves: 30,
            },
        } as unknown as ProviderPlayer

        const result = projectPlayerPoints({ ...base, teamSeasonGames: 120, player: reliever })

        // 345 points over 60 appearances, 6 * 0.5 = 3 appearances
        expect(result.points).toBe(17.3) // 17.25 rounded to one decimal
    })

    it('a pitcher labelled SP who only relieves is projected by appearances, not as a starter', () => {
        const mislabelled = {
            id: 4, primaryPosition: 'SP', active: true,
            pitchingStats: {
                gamesPlayed: 60, gamesStarted: 1, inningsPitched: '60.0', strikeOuts: 70,
                earnedRuns: 20, hits: 50, baseOnBalls: 20, wins: 4, saves: 30,
            },
        } as unknown as ProviderPlayer

        const result = projectPlayerPoints({ ...base, teamSeasonGames: 120, player: mislabelled })

        expect(result.starts).toBe(0)
        expect(result.points).toBe(17.3)
    })

    it('no games, no innings or an empty stat line gives null points with a reason, never NaN', () => {
        const empty = projectPlayerPoints({ ...base, player: hitter({ battingStats: {} }) })
        const noIp = projectPlayerPoints({
            ...base,
            player: { ...starter(), pitchingStats: { gamesPlayed: 0, gamesStarted: 0, inningsPitched: '0.0' } } as unknown as ProviderPlayer,
        })

        expect(empty).toMatchObject({ points: null, reason: 'NO_STATS' })
        expect(noIp).toMatchObject({ points: null, reason: 'NO_STATS' })
    })

    it('inactive player gives null points with reason INACTIVE', () => {
        expect(projectPlayerPoints({ ...base, player: hitter({ active: false }) })).toMatchObject({
            points: null,
            reason: 'INACTIVE',
        })
    })

    it('small samples are flagged low confidence', () => {
        const small = hitter({
            battingStats: { gamesPlayed: 10, plateAppearances: 30, hits: 8, runs: 3, rbi: 2, strikeOuts: 9 },
        })

        expect(projectPlayerPoints({ ...base, player: small }).confidence).toBe('low')
    })
})
