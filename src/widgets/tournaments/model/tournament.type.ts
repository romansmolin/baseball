// Widget-local view types. Domain types come from @/shared/tournaments.
// Region/League metadata is purely a presentation concern (sidebar grouping,
// dot color) and lives here.

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

export interface LeagueOption {
    slug: string
    name: string
    region: Region
    dotColor: string
}

// Toolbar UI affordances — kept independent of the API contract so the
// toolbar can compose filters the API understands. The "all" pseudo-status
// translates to "no filter".
export type StatusFilter = 'all' | 'drafting' | 'in_season' | 'completed'

// Sort keys are derived from the visible page, not the DB — the catalog caps
// the limit, so client-side sorting keeps the toolbar UX snappy.
export type SortKey = 'startsSoonest' | 'endsLatest' | 'prize' | 'memberCount'
