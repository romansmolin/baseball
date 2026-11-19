import type { HittingLine, PitchingLine } from '../../../src/shared/analytics'
import type { StatLine } from '../../providers/dto/provider-player-profile.dto'
import { innings, num, ratio, sum } from '../../shared/stat-parse'

export function hittingLineFromSeason(stat: StatLine): HittingLine {
    return {
        games: num(stat.gamesPlayed),
        plateAppearances: num(stat.plateAppearances),
        avg: num(stat.avg),
        obp: num(stat.obp),
        slg: num(stat.slg),
        ops: num(stat.ops),
        homeRuns: num(stat.homeRuns),
        rbi: num(stat.rbi),
        runs: num(stat.runs),
        stolenBases: num(stat.stolenBases),
        strikeOuts: num(stat.strikeOuts),
        walks: num(stat.baseOnBalls),
    }
}

// A recent window is built from game-log lines; rate stats are recomputed from the sums.
export function hittingLineFromGames(lines: StatLine[]): HittingLine {
    if (lines.length === 0) return { ...emptyHitting, games: 0 }

    const atBats = sum(lines, 'atBats')
    const hits = sum(lines, 'hits')
    const walks = sum(lines, 'baseOnBalls')
    const hitByPitch = sum(lines, 'hitByPitch')
    const sacFlies = sum(lines, 'sacFlies')
    const obp = ratio(hits + walks + hitByPitch, atBats + walks + hitByPitch + sacFlies)
    const slg = ratio(sum(lines, 'totalBases'), atBats)

    return {
        games: lines.length,
        plateAppearances: atBats + walks + hitByPitch + sacFlies,
        avg: ratio(hits, atBats),
        obp,
        slg,
        ops: obp !== null && slg !== null ? obp + slg : null,
        homeRuns: sum(lines, 'homeRuns'),
        rbi: sum(lines, 'rbi'),
        runs: sum(lines, 'runs'),
        stolenBases: sum(lines, 'stolenBases'),
        strikeOuts: sum(lines, 'strikeOuts'),
        walks,
    }
}

const emptyHitting: HittingLine = {
    games: null, plateAppearances: null, avg: null, obp: null, slg: null, ops: null,
    homeRuns: null, rbi: null, runs: null, stolenBases: null, strikeOuts: null, walks: null,
}

export function pitchingLineFromSeason(stat: StatLine): PitchingLine {
    return {
        games: num(stat.gamesPlayed),
        inningsPitched: innings(stat.inningsPitched),
        era: num(stat.era),
        whip: num(stat.whip),
        strikeOuts: num(stat.strikeOuts),
        walks: num(stat.baseOnBalls),
        wins: num(stat.wins),
        losses: num(stat.losses),
        saves: num(stat.saves),
        strikeoutsPer9: num(stat.strikeoutsPer9Inn),
    }
}

export function pitchingLineFromGames(lines: StatLine[]): PitchingLine {
    const inningsPitched = lines.reduce((total, line) => total + (innings(line.inningsPitched) ?? 0), 0)
    const strikeOuts = sum(lines, 'strikeOuts')

    return {
        games: lines.length,
        inningsPitched,
        era: ratio(9 * sum(lines, 'earnedRuns'), inningsPitched),
        whip: ratio(sum(lines, 'hits') + sum(lines, 'baseOnBalls'), inningsPitched),
        strikeOuts,
        walks: sum(lines, 'baseOnBalls'),
        wins: sum(lines, 'wins'),
        losses: sum(lines, 'losses'),
        saves: sum(lines, 'saves'),
        strikeoutsPer9: ratio(9 * strikeOuts, inningsPitched),
    }
}
