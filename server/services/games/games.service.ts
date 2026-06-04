import type { ISportsProvider } from '../../providers/sports-provider.interface'
import type { UpcomingGameRecord } from '../../../src/shared/games'

import type { IGamesService } from './games.service.interface'

// Window we look ahead across. MLB plays daily so 4 days reliably surfaces
// the next 5–10 games even if a team has an off-day.
const UPCOMING_WINDOW_DAYS = 4
const MS_PER_DAY = 24 * 60 * 60 * 1000

export class GamesService implements IGamesService {
    private readonly sportsProvider: ISportsProvider

    constructor(sportsProvider: ISportsProvider) {
        this.sportsProvider = sportsProvider
    }

    async getUpcomingGames(limit: number): Promise<UpcomingGameRecord[]> {
        const now = new Date()
        const end = new Date(now.getTime() + UPCOMING_WINDOW_DAYS * MS_PER_DAY)

        const games = await this.sportsProvider.getSchedule({
            startDateUtc: now,
            endDateUtc: end,
        })

        const upcoming = games
            .filter((g) => g.status !== 'FINAL' && g.status !== 'CANCELLED')
            .filter((g) => new Date(g.gameDateUtc).getTime() >= now.getTime() - 60 * 60 * 1000)
            .sort((a, b) => a.gameDateUtc.localeCompare(b.gameDateUtc))

        if (upcoming.length === 0) return []

        // Resolve team display names once, then enrich.
        const teamIds = new Set<number>()
        for (const game of upcoming) {
            teamIds.add(game.homeTeamId)
            teamIds.add(game.awayTeamId)
        }
        const teams = await this.sportsProvider.getTeams()
        const teamById = new Map(teams.map((t) => [t.id, t]))

        const fallback = (id: number) => ({
            id,
            name: 'Unknown',
            teamName: null,
            abbreviation: 'UNK',
        })

        return upcoming.slice(0, limit).map((g) => {
            const home = teamById.get(g.homeTeamId)
            const away = teamById.get(g.awayTeamId)
            return {
                gamePk: g.gamePk,
                gameDateUtc: g.gameDateUtc,
                status: g.status,
                homeTeam: home
                    ? {
                          id: home.id,
                          name: home.name,
                          teamName: home.teamName,
                          abbreviation: home.abbreviation,
                      }
                    : fallback(g.homeTeamId),
                awayTeam: away
                    ? {
                          id: away.id,
                          name: away.name,
                          teamName: away.teamName,
                          abbreviation: away.abbreviation,
                      }
                    : fallback(g.awayTeamId),
                venueName: home?.venueName ?? null,
            }
        })
    }
}
