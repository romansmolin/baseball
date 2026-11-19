export const CATEGORY_KEYS = ['R', 'HR', 'RBI', 'SB', 'AVG', 'W', 'SV', 'K', 'ERA', 'WHIP'] as const
export type CategoryKey = (typeof CATEGORY_KEYS)[number]

export type CategorySide = 'hitting' | 'pitching'

export const CATEGORY_SIDE: Record<CategoryKey, CategorySide> = {
    R: 'hitting',
    HR: 'hitting',
    RBI: 'hitting',
    SB: 'hitting',
    AVG: 'hitting',
    W: 'pitching',
    SV: 'pitching',
    K: 'pitching',
    ERA: 'pitching',
    WHIP: 'pitching',
}

export const CATEGORY_LABEL: Record<CategoryKey, string> = {
    R: 'Runs',
    HR: 'Home runs',
    RBI: 'RBI',
    SB: 'Stolen bases',
    AVG: 'Batting average',
    W: 'Wins',
    SV: 'Saves',
    K: 'Strikeouts',
    ERA: 'ERA',
    WHIP: 'WHIP',
}

// Lower is better: a low ERA / WHIP helps the team.
export const LOWER_IS_BETTER: CategoryKey[] = ['ERA', 'WHIP']

// The standard 5x5 set.
export const DEFAULT_CATEGORIES: CategoryKey[] = [...CATEGORY_KEYS]

// Expected stats of one player over the forecast period. Fields of the other
// side are zero. `bbh` is walks plus hits allowed (the WHIP numerator).
export interface ProjectedStats {
    side: CategorySide
    r: number
    hr: number
    rbi: number
    sb: number
    ab: number
    h: number
    w: number
    sv: number
    k: number
    ip: number
    er: number
    bbh: number
}

// A player's strongest categories, shown as chips in the player pool.
export interface CategoryChip {
    key: CategoryKey
    value: number
}
