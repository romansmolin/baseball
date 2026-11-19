import { describe, expect, it } from 'vitest'

import { estimateGame, type GameEstimateInput } from '../game-estimate'

const even = { winPct: 0.5, last10WinPct: 0.5 }
const ace = { era: 2.0, inningsPitched: 100 }
const replacement = { era: 6.0, inningsPitched: 100 }

const input = (overrides: Partial<GameEstimateInput> = {}): GameEstimateInput => ({
    gamePk: 1,
    home: even,
    away: even,
    homeStarter: null,
    awayStarter: null,
    ...overrides,
})

describe('estimateGame', () => {
    it('gives equal teams with no starters the home-field edge only, at low confidence', () => {
        const estimate = estimateGame(input())

        expect(estimate.homeWinProbability).toBeCloseTo(0.54, 5)
        expect(estimate.confidence).toBe('low')
        expect(estimate.gamePk).toBe(1)
    })

    it('favours the stronger team', () => {
        const estimate = estimateGame(
            input({ home: { winPct: 0.6, last10WinPct: 0.6 }, away: { winPct: 0.4, last10WinPct: 0.4 } }),
        )

        expect(estimate.homeWinProbability).toBeGreaterThan(0.7)
    })

    it('moves toward the better starter by at most 8 points', () => {
        const aceHome = estimateGame(input({ homeStarter: ace, awayStarter: replacement }))
        const absurd = estimateGame(
            input({ homeStarter: { era: 0, inningsPitched: 100 }, awayStarter: { era: 12, inningsPitched: 100 } }),
        )

        expect(aceHome.homeWinProbability).toBeCloseTo(0.62, 5)
        expect(absurd.homeWinProbability).toBeCloseTo(0.62, 5)
        expect(aceHome.confidence).toBe('medium')
    })

    it('still returns an estimate with low confidence when a probable pitcher is missing', () => {
        const estimate = estimateGame(input({ homeStarter: ace, awayStarter: null }))

        expect(estimate.homeWinProbability).toBeCloseTo(0.584, 5)
        expect(estimate.confidence).toBe('low')
    })

    it('treats a starter with under 30 innings as unknown', () => {
        const estimate = estimateGame(
            input({ homeStarter: { era: 0.5, inningsPitched: 12 }, awayStarter: replacement }),
        )

        expect(estimate.confidence).toBe('low')
    })

    it('stays inside 5%-95% and never returns NaN for a 1.000 vs .000 matchup', () => {
        const top = estimateGame(
            input({ home: { winPct: 1, last10WinPct: 1 }, away: { winPct: 0, last10WinPct: 0 } }),
        )
        const bottom = estimateGame(
            input({ home: { winPct: 0, last10WinPct: 0 }, away: { winPct: 1, last10WinPct: 1 } }),
        )

        expect(top.homeWinProbability).toBe(0.95)
        expect(bottom.homeWinProbability).toBe(0.05)
    })

    it('lists the factors that moved the number', () => {
        const estimate = estimateGame(input({ homeStarter: ace, awayStarter: replacement }))

        expect(estimate.factors.map((f) => f.key)).toEqual(['team_strength', 'home_field', 'starter'])
    })
})
