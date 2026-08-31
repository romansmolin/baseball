// Canonical baseball-league catalogue.
//
// This is the single source of truth for which leagues the platform supports
// and how they are labelled. It is frontend-safe (no server-only imports, no
// raw provider identifiers). The MLB Stats API `sportId` for each league lives
// separately in `server/providers/mlb/mlb-leagues.config.ts` — callers pass a
// league slug around the app, never a numeric id.

export type SupportedBaseballLeague =
    | 'mlb'
    | 'triple-a'
    | 'double-a'
    | 'high-a'
    | 'single-a'
    | 'rookie'

export type BaseballLeagueRegion = 'north-america' | 'japan-korea' | 'latin-america'

export interface BaseballLeagueConfig {
    slug: SupportedBaseballLeague
    /** Short display name used in pills, selectors and cards (e.g. "Triple-A"). */
    name: string
    /** Compact label for chips / badges (e.g. "AAA"). */
    shortName: string
    /** Long-form name for detail views (e.g. "Major League Baseball"). */
    fullName: string
    region: BaseballLeagueRegion
    /** Accent colour used across league-related UI. */
    color: string
    /** Approximate pro-team count for this level — config-driven, not a live count. */
    proTeams: number
    /** All entries here are backed by the MLB Stats API integration. */
    providerBacked: true
}

export const BASEBALL_LEAGUES: readonly BaseballLeagueConfig[] = [
    {
        slug: 'mlb',
        name: 'MLB',
        shortName: 'MLB',
        fullName: 'Major League Baseball',
        region: 'north-america',
        color: '#3b82f6',
        proTeams: 30,
        providerBacked: true,
    },
    {
        slug: 'triple-a',
        name: 'Triple-A',
        shortName: 'AAA',
        fullName: 'Triple-A Baseball',
        region: 'north-america',
        color: '#22c55e',
        proTeams: 30,
        providerBacked: true,
    },
    {
        slug: 'double-a',
        name: 'Double-A',
        shortName: 'AA',
        fullName: 'Double-A Baseball',
        region: 'north-america',
        color: '#06b6d4',
        proTeams: 30,
        providerBacked: true,
    },
    {
        slug: 'high-a',
        name: 'High-A',
        shortName: 'A+',
        fullName: 'High-A Baseball',
        region: 'north-america',
        color: '#f59e0b',
        proTeams: 12,
        providerBacked: true,
    },
    {
        slug: 'single-a',
        name: 'Single-A',
        shortName: 'A',
        fullName: 'Single-A Baseball',
        region: 'north-america',
        color: '#a855f7',
        proTeams: 12,
        providerBacked: true,
    },
    {
        slug: 'rookie',
        name: 'Rookie',
        shortName: 'R',
        fullName: 'Rookie / Complex Leagues',
        region: 'north-america',
        color: '#f43f5e',
        proTeams: 20,
        providerBacked: true,
    },
]

export const BASEBALL_LEAGUE_SLUGS: readonly SupportedBaseballLeague[] =
    BASEBALL_LEAGUES.map((league) => league.slug)

export const DEFAULT_BASEBALL_LEAGUE: SupportedBaseballLeague = 'mlb'

const LEAGUE_BY_SLUG: ReadonlyMap<string, BaseballLeagueConfig> = new Map(
    BASEBALL_LEAGUES.map((league) => [league.slug, league]),
)

export function isSupportedBaseballLeague(
    slug: string | null | undefined,
): slug is SupportedBaseballLeague {
    return slug != null && LEAGUE_BY_SLUG.has(slug)
}

export function getBaseballLeague(slug: string): BaseballLeagueConfig | undefined {
    return LEAGUE_BY_SLUG.get(slug)
}

// Leagues that are advertised in the product but do not yet have a data
// provider behind them. They still render in the league pickers, flagged as
// "coming soon", but cannot be selected for tournaments or team building.
export interface UnbackedBaseballLeague {
    slug: string
    name: string
    shortName: string
    fullName: string
    region: BaseballLeagueRegion
    color: string
    proTeams: number
    providerBacked: false
}

export const UNBACKED_BASEBALL_LEAGUES: readonly UnbackedBaseballLeague[] = [
    {
        slug: 'npb',
        name: 'NPB',
        shortName: 'NPB',
        fullName: 'Nippon Professional Baseball',
        region: 'japan-korea',
        color: '#ef4444',
        proTeams: 12,
        providerBacked: false,
    },
    {
        slug: 'kbo',
        name: 'KBO',
        shortName: 'KBO',
        fullName: 'Korea Baseball Organization',
        region: 'japan-korea',
        color: '#ec4899',
        proTeams: 10,
        providerBacked: false,
    },
    {
        slug: 'lvbp',
        name: 'LVBP',
        shortName: 'LVBP',
        fullName: 'Liga Venezolana de Béisbol Profesional',
        region: 'latin-america',
        color: '#f97316',
        proTeams: 8,
        providerBacked: false,
    },
    {
        slug: 'lmb',
        name: 'LMB',
        shortName: 'LMB',
        fullName: 'Liga Mexicana de Béisbol',
        region: 'latin-america',
        color: '#14b8a6',
        proTeams: 18,
        providerBacked: false,
    },
]
