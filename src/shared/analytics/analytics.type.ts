import type { EstimateFactor, GameEstimate, PlayerOutlook } from '@/shared/estimates'
import type { UpcomingGameRecord } from '@/shared/games'

// Every number is null when the source has no value for it — never 0 standing in for "unknown".
export interface HittingLine {
    games: number | null
    plateAppearances: number | null
    avg: number | null
    obp: number | null
    slg: number | null
    ops: number | null
    homeRuns: number | null
    rbi: number | null
    runs: number | null
    stolenBases: number | null
    strikeOuts: number | null
    walks: number | null
}

export interface PitchingLine {
    games: number | null
    inningsPitched: number | null
    era: number | null
    whip: number | null
    strikeOuts: number | null
    walks: number | null
    wins: number | null
    losses: number | null
    saves: number | null
    strikeoutsPer9: number | null
}

export interface FormWindow<Line> {
    // How many games or outings the window actually holds (may be fewer than asked for).
    games: number
    line: Line
}

export type SplitKey = 'vsLeft' | 'vsRight' | 'home' | 'away'

export interface HittingAnalytics {
    season: HittingLine | null
    form: FormWindow<HittingLine>[]
    splits: { key: SplitKey; line: HittingLine }[]
    woba: number | null
    wrcPlus: number | null
    war: number | null
}

export interface PitchingAnalytics {
    season: PitchingLine | null
    form: FormWindow<PitchingLine>[]
    splits: { key: SplitKey; line: PitchingLine }[]
    fip: number | null
    war: number | null
}

export interface ExpectedStats {
    xba: number | null
    xslg: number | null
    xwoba: number | null
    barrelRate: number | null
    hardHitRate: number | null
    sprintSpeed: number | null
}

export interface PlayerSummary {
    id: number
    fullName: string
    position: string
    teamName: string | null
    teamAbbreviation: string | null
    bats: 'L' | 'R' | 'S' | null
    throws: 'L' | 'R' | null
    age: number | null
    photoUrl: string | null
}

export interface PlayerStatus {
    code: string
    description: string
    available: boolean
}

export interface PlayerAnalytics {
    player: PlayerSummary
    status: PlayerStatus
    hitting: HittingAnalytics | null
    pitching: PitchingAnalytics | null
    expected: ExpectedStats | null
    outlook: PlayerOutlook
}

export interface CompareResult {
    players: PlayerAnalytics[]
    // Requested ids MLB does not know.
    missingIds: number[]
}

export interface PitcherSummary {
    id: number
    fullName: string
    throws: 'L' | 'R' | null
    era: number | null
    inningsPitched: number | null
}

export interface GameDetail {
    game: UpcomingGameRecord
    weather: { condition: string; tempF: number | null; wind: string } | null
    probablePitchers: { home: PitcherSummary | null; away: PitcherSummary | null }
    lineupsPosted: boolean
    estimate: GameEstimate | null
}

export type { EstimateFactor }
