import { WINTER_LEAGUE_SOURCES, type WinterLeagueSourceSlug } from '@/shared/baseball'
import type { ISportsProvider } from '../../providers/sports-provider.interface'
import type { DailyScheduledGame } from './daily-schedule.service'

const SLUG_BY_API_NAME = new Map<string, WinterLeagueSourceSlug>(WINTER_LEAGUE_SOURCES.map((league) => [league.apiName, league.slug]))

/** Groups winter games by the league of the home team. Games whose league is unknown are left out. */
export function groupByWinterLeague(
    rows: readonly DailyScheduledGame[],
    leagueOfTeam: (season: number, teamId: number) => string | null | undefined,
): Map<WinterLeagueSourceSlug, DailyScheduledGame[]> {
    const groups = new Map<WinterLeagueSourceSlug, DailyScheduledGame[]>()
    for (const row of rows) {
        const apiName = leagueOfTeam(row.apiSeason, row.game.homeTeamId)
        const slug = apiName ? SLUG_BY_API_NAME.get(apiName) : undefined
        if (!slug) continue
        groups.set(slug, [...(groups.get(slug) ?? []), row])
    }
    return groups
}

export async function splitWinterByLeague(
    provider: ISportsProvider,
    rows: readonly DailyScheduledGame[],
): Promise<Map<WinterLeagueSourceSlug, DailyScheduledGame[]>> {
    const seasons = [...new Set(rows.map((row) => row.apiSeason))]
    const leagues = new Map<string, string | null>()
    await Promise.all(seasons.map(async (season) => {
        for (const team of await provider.getTeams({ season, league: 'winter-leagues' })) leagues.set(`${season}:${team.id}`, team.league)
    }))
    return groupByWinterLeague(rows, (season, teamId) => leagues.get(`${season}:${teamId}`))
}
