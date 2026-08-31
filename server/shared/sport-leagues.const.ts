import type { BuilderLeague } from '@/shared/team-builder'
import { BASEBALL_LEAGUES, UNBACKED_BASEBALL_LEAGUES } from '@/shared/baseball'

// The league catalogue served by `GET /api/leagues`. Derived from the single
// canonical baseball-league config so the API, team builder, tournament logic
// and `/leagues` page can never drift apart. Provider-backed leagues come
// first, then the "coming soon" ones.
export const SPORT_LEAGUES: BuilderLeague[] = [
    ...BASEBALL_LEAGUES.map(
        (league): BuilderLeague => ({
            slug: league.slug,
            name: league.name,
            shortName: league.shortName,
            region: league.region,
            dotColor: league.color,
            providerBacked: true,
        }),
    ),
    ...UNBACKED_BASEBALL_LEAGUES.map(
        (league): BuilderLeague => ({
            slug: league.slug,
            name: league.name,
            shortName: league.shortName,
            region: league.region,
            dotColor: league.color,
            providerBacked: false,
        }),
    ),
]
