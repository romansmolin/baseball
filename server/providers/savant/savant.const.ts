export const SAVANT_BASE_URL = 'https://baseballsavant.mlb.com'

// Savant's expected-stat leaderboards change once a day.
export const SAVANT_REVALIDATE_SECONDS = 86400

// Columns requested from the custom leaderboard, in the order they are asked for.
export const SAVANT_SELECTIONS = [
    'xba',
    'xslg',
    'xwoba',
    'barrel_batted_rate',
    'hard_hit_percent',
    'sprint_speed',
] as const
