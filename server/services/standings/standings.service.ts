import { WINTER_LEAGUE_SOURCES } from '@/shared/baseball'
import { STANDINGS_SOURCES, type Standings } from '@/shared/stats'
import { env } from '../../lib/env'
import { mlbFetch } from '../../providers/mlb/mlb.client'
import { sportIdFor } from '../../providers/mlb/mlb-leagues.config'
import { mapStandingsToGroups, type RawStandingsResponse } from './standings.mapper'
import type { IStandingsService } from './standings.service.interface'

const WINTER_SPORT_ID = 17
const LEAGUES_REVALIDATE_SECONDS = 86400
const STANDINGS_REVALIDATE_SECONDS = 600
// Spring training circuits share the MLB sport but are not standings people look for.
const SPRING_LEAGUE = /Cactus|Grapefruit/

export class StandingsService implements IStandingsService {
    async getStandings(slug: string): Promise<Standings> {
        const label = STANDINGS_SOURCES.find((source) => source.slug === slug)?.label ?? slug
        const winter = WINTER_LEAGUE_SOURCES.find((league) => league.slug === slug)
        const apiLabel = (apiName: string) => WINTER_LEAGUE_SOURCES.find((league) => league.apiName === apiName)?.label ?? apiName
        const year = env.defaultSeason()

        // A winter season starts in autumn and ends the next year, so look at last year's too.
        for (const season of winter ? [year, year - 1] : [year]) {
            const sportId = winter ? WINTER_SPORT_ID : sportIdFor(slug as Parameters<typeof sportIdFor>[0])
            const { leagues } = await mlbFetch<{ leagues: { id: number; name: string }[] }>(`/leagues?sportId=${sportId}&season=${season}`, { revalidate: LEAGUES_REVALIDATE_SECONDS })
            const ids = leagues.filter((league) => (winter ? league.name === winter.apiName : !SPRING_LEAGUE.test(league.name))).map((league) => league.id)
            if (!ids.length) continue
            const raw = await mlbFetch<RawStandingsResponse>(`/standings?leagueId=${ids.join(',')}&season=${season}&hydrate=league,division`, { revalidate: STANDINGS_REVALIDATE_SECONDS })
            const groups = mapStandingsToGroups(raw, apiLabel)
            if (groups.length) return { slug, label, season, groups }
        }
        return { slug, label, season: year, groups: [] }
    }
}
