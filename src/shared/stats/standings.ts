import { WINTER_LEAGUE_LABELS } from '@/shared/baseball'

export interface StandingRow {
    teamId: number
    name: string
    wins: number
    losses: number
    /** Winning percentage as the API prints it, e.g. ".714". */
    pct: string
    gamesBack: string
    runDifferential: number
    streak: string | null
}

export interface StandingGroup {
    id: string
    name: string
    rows: StandingRow[]
}

export interface Standings {
    slug: string
    label: string
    /** The season the table is from; a winter league between seasons shows the last finished one. */
    season: number
    groups: StandingGroup[]
}

/** Leagues that have a standings table, in the order they are offered. */
export const STANDINGS_SOURCES = [
    { slug: 'mlb', label: 'MLB' },
    { slug: 'triple-a', label: 'Triple-A' },
    { slug: 'double-a', label: 'Double-A' },
    { slug: 'high-a', label: 'High-A' },
    { slug: 'single-a', label: 'Single-A' },
    ...Object.entries(WINTER_LEAGUE_LABELS).map(([slug, label]) => ({ slug, label })),
] as const

export const STANDINGS_SLUGS = STANDINGS_SOURCES.map((source) => source.slug) as [string, ...string[]]
