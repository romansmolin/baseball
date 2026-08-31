import {
    DEFAULT_BASEBALL_LEAGUE,
    type SupportedBaseballLeague,
} from '../../../src/shared/baseball'

// The ONLY place raw MLB Stats API `sportId` numbers are allowed to live.
// Everything else in the app refers to a league by its slug; this module
// translates a slug into the `sportId` the MLB provider needs on the wire.
//
//   1  MLB        11 Triple-A    12 Double-A
//   13 High-A     14 Single-A    16 Rookie / Complex
const SPORT_ID_BY_LEAGUE: Record<SupportedBaseballLeague, number> = {
    mlb: 1,
    'triple-a': 11,
    'double-a': 12,
    'high-a': 13,
    'single-a': 14,
    rookie: 16,
}

// How reliably the MLB Stats API box-score endpoints populate batter / pitcher
// stat lines for each level.
//   'full'    — stat lines populate dependably; scoring behaves like MLB.
//   'partial' — schedules & rosters are solid, but box-score stat lines are
//               frequently sparse or absent, and players move between levels
//               often enough that a frozen roster can't be tracked precisely.
//               Scoring still runs; a missing line scores 0.
export const BOX_SCORE_SUPPORT: Record<SupportedBaseballLeague, 'full' | 'partial'> = {
    mlb: 'full',
    'triple-a': 'full',
    'double-a': 'full',
    'high-a': 'partial',
    'single-a': 'partial',
    rookie: 'partial',
}

// Whether scoring may scope a week's schedule to just the rostered players'
// teams (frozen team ∪ current team). Safe only where in-season roster
// movement is rare enough that those two snapshots cover a player's whole
// season — i.e. the 'full' levels. Elsewhere scoring uses the full-league
// schedule so promotions between levels don't silently drop points.
export function canTeamScopeSchedule(league: SupportedBaseballLeague | undefined): boolean {
    return BOX_SCORE_SUPPORT[league ?? DEFAULT_BASEBALL_LEAGUE] === 'full'
}

// Resolve a possibly-absent league slug to a sportId, defaulting to MLB so that
// every pre-existing caller that passes no league keeps hitting sportId 1.
export function resolveSportId(league?: SupportedBaseballLeague | null): number {
    return SPORT_ID_BY_LEAGUE[league ?? DEFAULT_BASEBALL_LEAGUE]
}

export function sportIdFor(league: SupportedBaseballLeague): number {
    return SPORT_ID_BY_LEAGUE[league]
}
