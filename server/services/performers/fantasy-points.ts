import type { PerformerStat } from '../../../src/shared/performers'
import type { StatLine } from '../../providers/dto/provider-player-profile.dto'
import { innings, num } from '../../shared/stat-parse'

const n = (line: StatLine, key: string) => num(line[key]) ?? 0

export interface PointsPart {
    label: string
    points: number
}

// Generic points scoring (the app's POINTS preset has no league-specific weights yet).
// The total is the sum of the parts, so a chart of the parts always adds up to the score.
export function hittingBreakdown(line: StatLine): PointsPart[] {
    const singles = n(line, 'hits') - n(line, 'doubles') - n(line, 'triples') - n(line, 'homeRuns')
    return [
        { label: 'Singles', points: singles },
        { label: 'Doubles', points: 2 * n(line, 'doubles') },
        { label: 'Triples', points: 3 * n(line, 'triples') },
        { label: 'Home runs', points: 4 * n(line, 'homeRuns') },
        { label: 'RBI', points: n(line, 'rbi') },
        { label: 'Runs', points: n(line, 'runs') },
        { label: 'Walks', points: n(line, 'baseOnBalls') + n(line, 'hitByPitch') },
        { label: 'Steals', points: 2 * n(line, 'stolenBases') },
        { label: 'Strikeouts', points: -0.5 * n(line, 'strikeOuts') },
    ]
}

export function pitchingBreakdown(line: StatLine): PointsPart[] {
    return [
        { label: 'Innings', points: 3 * (innings(line.inningsPitched) ?? 0) },
        { label: 'Strikeouts', points: n(line, 'strikeOuts') },
        { label: 'Wins and saves', points: 5 * n(line, 'wins') + 5 * n(line, 'saves') },
        { label: 'Earned runs', points: -2 * n(line, 'earnedRuns') },
        { label: 'Hits and walks', points: -0.5 * (n(line, 'hits') + n(line, 'baseOnBalls')) },
    ]
}

const total = (parts: PointsPart[]) => parts.reduce((sum, part) => sum + part.points, 0)

export const hittingPoints = (line: StatLine): number => total(hittingBreakdown(line))
export const pitchingPoints = (line: StatLine): number => total(pitchingBreakdown(line))

export function hittingStats(line: StatLine): PerformerStat[] {
    const out = [{ label: 'H-AB', value: `${n(line, 'hits')}-${n(line, 'atBats')}` }]
    if (n(line, 'homeRuns') > 0) out.push({ label: 'HR', value: String(n(line, 'homeRuns')) })
    if (n(line, 'rbi') > 0) out.push({ label: 'RBI', value: String(n(line, 'rbi')) })
    if (n(line, 'stolenBases') > 0) out.push({ label: 'SB', value: String(n(line, 'stolenBases')) })
    return out
}

export function pitchingStats(line: StatLine): PerformerStat[] {
    const out = [
        { label: 'IP', value: String(line.inningsPitched) },
        { label: 'K', value: String(n(line, 'strikeOuts')) },
        { label: 'ERA', value: String(line.era) },
    ]
    if (n(line, 'wins') > 0) out.push({ label: 'W', value: String(n(line, 'wins')) })
    if (n(line, 'saves') > 0) out.push({ label: 'SV', value: String(n(line, 'saves')) })
    return out
}
