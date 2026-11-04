import { z } from 'zod'

import { STANDINGS_SLUGS } from '@/shared/stats'

export const standingsQuerySchema = z.object({
    league: z.enum(STANDINGS_SLUGS),
})

export type StandingsQuery = z.infer<typeof standingsQuerySchema>
