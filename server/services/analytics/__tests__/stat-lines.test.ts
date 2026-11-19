import { describe, expect, it } from 'vitest'

import {
    hittingLineFromGames,
    hittingLineFromSeason,
    pitchingLineFromGames,
    pitchingLineFromSeason,
} from '../stat-lines'

const game1 = { atBats: 4, hits: 2, baseOnBalls: 1, hitByPitch: 0, sacFlies: 0, totalBases: 5, homeRuns: 1, rbi: 2, runs: 1, stolenBases: 0, strikeOuts: 1 }
const game2 = { atBats: 3, hits: 0, baseOnBalls: 0, hitByPitch: 1, sacFlies: 1, totalBases: 0, homeRuns: 0, rbi: 0, runs: 0, stolenBases: 1, strikeOuts: 2 }

describe('hittingLineFromSeason', () => {
    it('parses MLB string stats into numbers', () => {
        const line = hittingLineFromSeason({
            gamesPlayed: 150, plateAppearances: 600, avg: '.300', obp: '.400', slg: '.550', ops: '.950',
            homeRuns: 40, rbi: 100, runs: 110, stolenBases: 10, strikeOuts: 150, baseOnBalls: 90,
        })

        expect(line).toEqual({
            games: 150, plateAppearances: 600, avg: 0.3, obp: 0.4, slg: 0.55, ops: 0.95,
            homeRuns: 40, rbi: 100, runs: 110, stolenBases: 10, strikeOuts: 150, walks: 90,
        })
    })

    it('turns MLB placeholders like "-.--" into null', () => {
        const line = hittingLineFromSeason({ avg: '-.--', ops: '.---', plateAppearances: 0 })

        expect(line.avg).toBeNull()
        expect(line.ops).toBeNull()
        expect(line.plateAppearances).toBe(0)
    })
})

describe('hittingLineFromGames', () => {
    it('sums the games and derives the rate stats', () => {
        const line = hittingLineFromGames([game1, game2])

        expect(line.games).toBe(2)
        expect(line.plateAppearances).toBe(10)
        expect(line.avg).toBeCloseTo(2 / 7, 5)
        expect(line.obp).toBeCloseTo(0.4, 5)
        expect(line.slg).toBeCloseTo(5 / 7, 5)
        expect(line.ops).toBeCloseTo(0.4 + 5 / 7, 5)
        expect([line.homeRuns, line.rbi, line.runs, line.stolenBases, line.strikeOuts, line.walks]).toEqual([1, 2, 1, 1, 3, 1])
    })

    it('gives null rate stats, not NaN, when there are no at-bats', () => {
        const line = hittingLineFromGames([{ atBats: 0, hits: 0, baseOnBalls: 0 }])

        expect(line.avg).toBeNull()
        expect(line.slg).toBeNull()
        expect(line.ops).toBeNull()
    })

    it('gives a null-filled line for an empty window', () => {
        const line = hittingLineFromGames([])

        expect(line.games).toBe(0)
        expect(line.avg).toBeNull()
        expect(line.homeRuns).toBeNull()
    })
})

describe('pitchingLineFromSeason', () => {
    it('parses innings written as 150.1 into thirds', () => {
        const line = pitchingLineFromSeason({
            gamesPlayed: 30, inningsPitched: '150.1', era: '3.25', whip: '1.10',
            strikeOuts: 180, baseOnBalls: 40, wins: 12, losses: 6, saves: 0, strikeoutsPer9Inn: '10.76',
        })

        expect(line.inningsPitched).toBeCloseTo(150 + 1 / 3, 5)
        expect(line.era).toBe(3.25)
        expect(line.whip).toBe(1.1)
        expect(line.strikeoutsPer9).toBe(10.76)
        expect([line.wins, line.losses, line.saves, line.walks]).toEqual([12, 6, 0, 40])
    })
})

describe('pitchingLineFromGames', () => {
    it('derives ERA and WHIP from the summed outings', () => {
        const line = pitchingLineFromGames([
            { inningsPitched: '6.0', earnedRuns: 2, hits: 5, baseOnBalls: 1, strikeOuts: 7 },
            { inningsPitched: '5.1', earnedRuns: 3, hits: 6, baseOnBalls: 2, strikeOuts: 4 },
        ])
        const innings = 6 + 5 + 1 / 3

        expect(line.games).toBe(2)
        expect(line.inningsPitched).toBeCloseTo(innings, 5)
        expect(line.era).toBeCloseTo((9 * 5) / innings, 5)
        expect(line.whip).toBeCloseTo(14 / innings, 5)
        expect(line.strikeOuts).toBe(11)
        expect(line.strikeoutsPer9).toBeCloseTo((9 * 11) / innings, 5)
    })

    it('gives null ERA and WHIP when no innings were pitched', () => {
        const line = pitchingLineFromGames([{ inningsPitched: '0.0', earnedRuns: 0, hits: 0, baseOnBalls: 0, strikeOuts: 0 }])

        expect(line.era).toBeNull()
        expect(line.whip).toBeNull()
    })
})
