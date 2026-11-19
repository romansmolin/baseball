export const FANTASY_FORMATS = ['H2H_POINTS', 'H2H_CATEGORIES', 'ROTO', 'DFS'] as const
export type FantasyFormat = (typeof FANTASY_FORMATS)[number]

// Formats the builder can already project and fill. The rest show as "soon".
export const SUPPORTED_FORMATS: FantasyFormat[] = ['H2H_POINTS', 'H2H_CATEGORIES', 'ROTO']

export const FORMAT_LABEL: Record<FantasyFormat, string> = {
    H2H_POINTS: 'Head-to-Head Points',
    H2H_CATEGORIES: 'Head-to-Head Categories',
    ROTO: 'Rotisserie (Roto)',
    DFS: 'Daily Fantasy (DFS)',
}

export const FORMAT_DESCRIPTION: Record<FantasyFormat, string> = {
    H2H_POINTS:
        'One opponent per period, usually a week. The team with more total points wins.',
    H2H_CATEGORIES:
        'One opponent per period, usually a week. Teams are compared in each category separately.',
    ROTO: 'All teams are ranked in every category over the season. Category places add up to the standings.',
    DFS: 'A separate contest on one game or a slate of games. Your points in that contest decide the result.',
}

export const FORECAST_PERIODS = ['DAY', 'WEEK', 'SEASON'] as const
export type ForecastPeriod = (typeof FORECAST_PERIODS)[number]

export const FORECAST_PERIOD_LABEL: Record<ForecastPeriod, string> = {
    DAY: 'Day',
    WEEK: 'Week',
    SEASON: 'Season',
}

// How often the league lets you change your active players. Separate from
// the scoring period: a league can score a week and allow daily changes.
export const LINEUP_CHANGES = ['DAILY', 'WEEKLY'] as const
export type LineupChanges = (typeof LINEUP_CHANGES)[number]

export const LINEUP_CHANGES_LABEL: Record<LineupChanges, string> = {
    DAILY: 'Daily',
    WEEKLY: 'Weekly',
}
