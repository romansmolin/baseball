import type { Position } from '@/shared/sports'

type PlayerStats = Record<string, string | number> | undefined

export const PLAYER_STAT_LABELS: Record<string, string> = {
    avg: 'AVG',
    atBats: 'At bats',
    baseOnBalls: 'Walks',
    caughtStealing: 'Caught stealing',
    doubles: 'Doubles',
    era: 'ERA',
    gamesPlayed: 'Games played',
    hits: 'Hits',
    homeRuns: 'Home runs',
    inningsPitched: 'Innings pitched',
    losses: 'Losses',
    obp: 'OBP',
    ops: 'OPS',
    rbi: 'RBI',
    runs: 'Runs',
    saves: 'Saves',
    slugging: 'SLG',
    strikeOuts: 'Strikeouts',
    stolenBases: 'Stolen bases',
    triples: 'Triples',
    whip: 'WHIP',
    wins: 'Wins',
}

export function formatPlayerStatLabel(key: string): string {
    return PLAYER_STAT_LABELS[key] ?? key.replace(/([a-z])([A-Z])/g, '$1 $2')
}

export function getPlayerStatSummary({
    position,
    battingStats,
    pitchingStats,
}: {
    position: Position
    battingStats?: PlayerStats
    pitchingStats?: PlayerStats
}): [string, string][] {
    const isPitcher = position === 'SP' || position === 'RP'
    const stats = isPitcher ? pitchingStats : battingStats
    const keys = isPitcher
        ? [['ERA', 'era'], ['W', 'wins'], ['SO', 'strikeOuts']]
        : [['AVG', 'avg'], ['HR', 'homeRuns'], ['RBI', 'rbi']]

    return keys.map(([label, key]) => [label, stats?.[key] == null ? '—' : String(stats[key])])
}
