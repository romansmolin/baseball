import type { BaseballProviderLeague, WinterLeagueSourceSlug } from '@/shared/baseball'

/** The persisted slug for contests assembled from the North American feed. */
export const NORTH_AMERICA_CONTEST_SOURCE = 'north-america' as const

/** Winter Leagues (sportId 17) fill the months between seasons; they publish as their own source. */
export const WINTER_CONTEST_SOURCE = 'winter-leagues' as const
/** Each winter league also publishes its own daily contests next to the combined Winter Leagues ones. */
export type ContestSourceSlug = typeof NORTH_AMERICA_CONTEST_SOURCE | typeof WINTER_CONTEST_SOURCE | typeof MINOR_CONTEST_SOURCE | WinterLeagueSourceSlug

/** High-A, Single-A and Rookie publish as their own source, so they never dilute the MLB, Triple-A and Double-A pool. */
export const MINOR_CONTEST_SOURCE = 'minor-leagues' as const
export const MINOR_CONTEST_LEAGUES = ['high-a', 'single-a', 'rookie'] as const satisfies readonly BaseballProviderLeague[]

/** Minor League publication is off unless CONTEST_MINOR_ENABLED is exactly "true". */
export function minorContestsEnabled(env: Record<string, string | undefined>): boolean {
    return env.CONTEST_MINOR_ENABLED === 'true'
}

/** Winter publication is off unless CONTEST_WINTER_ENABLED is exactly "true". */
export function winterContestsEnabled(env: Record<string, string | undefined>): boolean {
    return env.CONTEST_WINTER_ENABLED === 'true'
}

/**
 * Only MLB Stats API levels with complete box-score support are eligible for
 * public contests. The remaining MiLB levels stay available elsewhere in the
 * product, but their partial stat coverage is not suitable for contest scoring.
 */
export const NORTH_AMERICA_CONTEST_LEAGUES = [
    'mlb',
    'triple-a',
    'double-a',
] as const satisfies readonly BaseballProviderLeague[]

/**
 * Public contests use real games only: regular season and postseason. Spring training
 * is excluded because its rosters and box scores are not suited to contest scoring.
 */
export const CONTEST_GAME_TYPES = 'R,F,D,L,W'

/** Asian sources are deliberately not wired into public contest publication. */
export const CONTEST_SOURCE_ROLLOUT = {
    mlbStatsApi: { enabled: true, provider: 'mlb-stats-api' },
    spaiaNpb: { enabled: false, provider: 'spaia', reason: 'Display and redistribution rights are unconfirmed.' },
    kbo: { enabled: false, provider: null, reason: 'No approved complete data source is configured.' },
} as const
