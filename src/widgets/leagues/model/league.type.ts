export type Region = 'north-america' | 'japan-korea' | 'latin-america'

export const REGION_LABEL: Record<Region, string> = {
    'north-america': 'North America',
    'japan-korea': 'Japan & Korea',
    'latin-america': 'Latin America',
}

export const REGION_ORDER: Region[] = ['north-america', 'japan-korea', 'latin-america']

export type SeasonStatus = 'live' | 'offseason'
export type LeagueFormat = 'Daily' | 'Weekly' | 'Tournament'

export interface League {
    slug: string
    name: string
    full: string
    region: Region
    color: string
    country: string
    proTeams: number
    season: SeasonStatus
    // Real data provider stands behind this league. `false` → shown as
    // "coming soon", not selectable for tournaments or teams.
    providerBacked: boolean
    myTeams: number
    openTournaments: number
    prizePool: string
    formats: LeagueFormat[]
    topScorer: string
    topPoints: number
    description: string
}

export type RegionFilter = 'all' | Region
export type SortKey = 'tournaments' | 'prize' | 'teams' | 'name'
