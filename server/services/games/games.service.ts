import type { ProviderScheduledGame } from '../../providers/dto/provider-schedule.dto'
import type { ISportsProvider } from '../../providers/sports-provider.interface'
import type { BaseballProviderLeague } from '../../../src/shared/baseball'
import type { UpcomingGameRecord } from '../../../src/shared/games'

import type { IGamesService } from './games.service.interface'

// Window we look ahead across. MLB plays daily so 4 days reliably surfaces
// the next 5–10 games even if a team has an off-day.
const UPCOMING_WINDOW_DAYS = 4
const MS_PER_DAY = 24 * 60 * 60 * 1000
// How far back the results list reaches.
const RECENT_WINDOW_DAYS = 3
// Short TTL so LIVE scores don't lag the default 15-minute schedule cache.
const LIVE_SCORE_REVALIDATE_SECONDS = 60

// MLB plays in season; the Winter Leagues keep real games on the schedule between seasons.
const GAME_LEAGUES: BaseballProviderLeague[] = ['mlb', 'winter-leagues']

interface LeagueGame {
    league: BaseballProviderLeague
    game: ProviderScheduledGame
}

export class GamesService implements IGamesService {
    private readonly sportsProvider: ISportsProvider

    constructor(sportsProvider: ISportsProvider) {
        this.sportsProvider = sportsProvider
    }

    async getUpcomingGames(limit: number): Promise<UpcomingGameRecord[]> {
        const now = new Date()
        const end = new Date(now.getTime() + UPCOMING_WINDOW_DAYS * MS_PER_DAY)

        const games = await this.loadSchedule({ startDateUtc: now, endDateUtc: end })

        const upcoming = games
            .filter(({ game: g }) => g.status !== 'FINAL' && g.status !== 'CANCELLED')
            .filter(({ game: g }) => new Date(g.gameDateUtc).getTime() >= now.getTime() - 60 * 60 * 1000)
            .sort((a, b) => a.game.gameDateUtc.localeCompare(b.game.gameDateUtc))

        return this.toRecords(upcoming.slice(0, limit))
    }

    async getRecentGames(limit: number): Promise<UpcomingGameRecord[]> {
        const now = new Date()
        const start = new Date(now.getTime() - RECENT_WINDOW_DAYS * MS_PER_DAY)

        const games = await this.loadSchedule({
            startDateUtc: start,
            endDateUtc: now,
            revalidateSeconds: LIVE_SCORE_REVALIDATE_SECONDS,
        })

        // Newest first; only games that have actually started.
        const started = games
            .filter(({ game: g }) => g.status === 'LIVE' || g.status === 'FINAL')
            .sort((a, b) => b.game.gameDateUtc.localeCompare(a.game.gameDateUtc))

        return this.toRecords(started.slice(0, limit))
    }

    // One failing league must not blank the page; only a total failure is an error.
    private async loadSchedule(range: {
        startDateUtc: Date
        endDateUtc: Date
        revalidateSeconds?: number
    }): Promise<LeagueGame[]> {
        const results = await Promise.allSettled(
            GAME_LEAGUES.map(async (league) =>
                (await this.sportsProvider.getSchedule({ ...range, league })).map((game) => ({
                    league,
                    game,
                })),
            ),
        )
        const failed = results.filter((r) => r.status === 'rejected')
        if (failed.length === results.length) throw failed[0].reason
        return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
    }

    private async toRecords(games: LeagueGame[]): Promise<UpcomingGameRecord[]> {
        if (games.length === 0) return []

        const leagues = [...new Set(games.map((g) => g.league))]
        const teamLists = await Promise.all(
            leagues.map((league) => this.sportsProvider.getTeams({ league })),
        )
        const teamByKey = new Map(
            leagues.flatMap((league, i) => teamLists[i].map((t) => [`${league}:${t.id}`, t] as const)),
        )

        const fallback = (id: number) => ({
            id,
            name: 'Unknown',
            teamName: null,
            abbreviation: 'UNK',
        })
        const side = (league: BaseballProviderLeague, id: number) => {
            const team = teamByKey.get(`${league}:${id}`)
            return team
                ? { id: team.id, name: team.name, teamName: team.teamName, abbreviation: team.abbreviation }
                : fallback(id)
        }

        return games.map(({ league, game: g }) => ({
            gamePk: g.gamePk,
            gameDateUtc: g.gameDateUtc,
            status: g.status,
            leagueSlug: league,
            homeTeam: side(league, g.homeTeamId),
            awayTeam: side(league, g.awayTeamId),
            venueName: teamByKey.get(`${league}:${g.homeTeamId}`)?.venueName ?? null,
            homeScore: g.homeScore,
            awayScore: g.awayScore,
        }))
    }
}
