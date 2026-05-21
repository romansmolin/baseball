export type Region =
    | 'north-america'
    | 'japan-korea'
    | 'latin-america'
    | 'caribbean'
    | 'australia'

export const REGION_LABEL: Record<Region, string> = {
    'north-america': 'North America',
    'japan-korea': 'Japan & Korea',
    'latin-america': 'Latin America',
    caribbean: 'Caribbean',
    australia: 'Australia',
}

export const REGION_ORDER: Region[] = [
    'north-america',
    'japan-korea',
    'latin-america',
    'caribbean',
    'australia',
]

export interface League {
    slug: string
    name: string
    region: Region
    dotColor: string
}

export type ContestStatus = 'open' | 'live' | 'soon' | 'full'
export type ContestFormat = 'Daily' | 'H2H' | 'Weekly' | 'Tournament'

export interface RosterRequirement {
    position: string
    count: number
}

export interface ScoringRule {
    action: string
    points: number
}

export interface Contest {
    id: string
    name: string
    leagueSlug: string
    format: ContestFormat
    status: ContestStatus
    prizeCredits: number
    entryFeeCredits: number
    currentEntries: number
    maxEntries: number
    lockAtLabel: string
    lockAtMinutes: number
    roster: RosterRequirement[]
    scoring: ScoringRule[]
}

export type SortKey = 'prize' | 'entryFee' | 'lockSoon' | 'fillPct'
export type StatusFilter = 'all' | 'live' | 'open' | 'soon' | 'free'

export interface ContestsFilterState {
    leagueSlug: string | null
    status: StatusFilter
    sort: SortKey
    leagueSearch: string
    selectedContestId: string | null
}
