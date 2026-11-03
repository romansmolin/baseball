import type { BaseballProviderLeague } from '@/shared/baseball'

/** The persisted slug for contests assembled from the North American feed. */
export const NORTH_AMERICA_CONTEST_SOURCE = 'north-america' as const

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

/** Asian sources are deliberately not wired into public contest publication. */
export const CONTEST_SOURCE_ROLLOUT = {
    mlbStatsApi: { enabled: true, provider: 'mlb-stats-api' },
    spaiaNpb: { enabled: false, provider: 'spaia', reason: 'Display and redistribution rights are unconfirmed.' },
    kbo: { enabled: false, provider: null, reason: 'No approved complete data source is configured.' },
} as const
