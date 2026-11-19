import type { GameLeague } from '@/shared/games'

export type PerformerGroup = 'hitting' | 'pitching'

export interface PerformerStat {
    // Short abbreviation shown next to the value, e.g. "HR", "IP".
    label: string
    value: string
}

export interface TopPerformer {
    playerId: number
    name: string
    teamName: string
    position: string | null
    league: GameLeague
    // Fantasy points over the period, one decimal.
    points: number
    stats: PerformerStat[]
}

export interface WeeklyTopPerformers {
    hitters: TopPerformer[]
    pitchers: TopPerformer[]
}

export interface PerformerGameEntry {
    // YYYY-MM-DD
    date: string
    opponent: string
    points: number
    // Falls inside the "top performers" window (the last 7 days).
    inWindow: boolean
    // MLB's own one-line summary, e.g. "3-4 | HR, 2 RBI".
    summary: string
    // Season-to-date OPS (hitters) or ERA (pitchers) after this game.
    trend: number | null
}

export interface PerformerComparison {
    label: string
    window: number | null
    season: number | null
    // For ERA and WHIP a lower number is the better one.
    lowerIsBetter: boolean
    digits: number
}

export interface PerformerDetail {
    playerId: number
    name: string
    position: string | null
    teamName: string | null
    group: PerformerGroup
    league: GameLeague
    windowGames: number
    points: number
    pointsPerGame: number | null
    seasonPointsPerGame: number | null
    // Headline numbers for the window.
    stats: PerformerStat[]
    // The latest games, oldest first.
    games: PerformerGameEntry[]
    trendLabel: 'OPS' | 'ERA'
    // Where the points of the window came from; negative parts cost points.
    mix: Array<{ label: string; points: number }>
    comparison: PerformerComparison[]
}
