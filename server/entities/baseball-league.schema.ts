import { z } from 'zod'

import { BASEBALL_LEAGUE_SLUGS, type SupportedBaseballLeague } from '@/shared/baseball'

// Shared Zod enum for the supported baseball leagues. Driven off the single
// canonical slug list so route validation can never accept a league the
// provider doesn't back — `?league=npb` fails validation with a 400 instead
// of silently falling through to MLB.
export const baseballLeagueEnum = z.enum(
    BASEBALL_LEAGUE_SLUGS as unknown as [SupportedBaseballLeague, ...SupportedBaseballLeague[]],
)

export type BaseballLeagueQueryValue = z.infer<typeof baseballLeagueEnum>
