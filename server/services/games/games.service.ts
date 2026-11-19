import type { GameDetail, PitcherSummary } from '../../../src/shared/analytics'
import type { GameEstimate } from '../../../src/shared/estimates'
import type { UpcomingGameRecord } from '../../../src/shared/games'
import type { GameLeague } from '../../../src/shared/games'
import { GAME_LEAGUES } from '../../../src/shared/games'
import type { ProviderGameContext } from '../../providers/dto/provider-game-context.dto'
import type { ProviderPlayer } from '../../providers/dto/provider-player.dto'
import type { ProviderTeamStanding } from '../../providers/dto/provider-team-standing.dto'
import type { ISportsProvider } from '../../providers/sports-provider.interface'
import { env } from '../../lib/env'
import { innings, num } from '../../shared/stat-parse'
import { starterStrengthFrom, teamStrengthFor } from '../estimates/estimate-inputs'
import { estimateGame } from '../estimates/game-estimate'

import type { IGamesService } from './games.service.interface'

// Window we look ahead across. MLB plays daily so 4 days reliably surfaces
// the next 5–10 games even if a team has an off-day.
const UPCOMING_WINDOW_DAYS = 4
const MS_PER_DAY = 24 * 60 * 60 * 1000

interface LeagueGame {
    league: GameLeague
    context: ProviderGameContext
}

export class GamesService implements IGamesService {
    private readonly sportsProvider: ISportsProvider

    constructor(sportsProvider: ISportsProvider) {
        this.sportsProvider = sportsProvider
    }

    async getUpcomingGames(limit: number, days: number = UPCOMING_WINDOW_DAYS): Promise<UpcomingGameRecord[]> {
        const now = new Date()
        const end = new Date(now.getTime() + days * MS_PER_DAY)

        const games = await this.loadSchedule({ startDateUtc: now, endDateUtc: end })

        const upcoming = games
            .filter(({ context: { game: g } }) => g.status !== 'FINAL' && g.status !== 'CANCELLED')
            .filter(({ context: { game: g } }) => new Date(g.gameDateUtc).getTime() >= now.getTime() - 60 * 60 * 1000)
            .sort((a, b) => a.context.game.gameDateUtc.localeCompare(b.context.game.gameDateUtc))
            .slice(0, limit)

        return this.toRecords(upcoming)
    }

    async getGameDetail(gamePk: number, league: GameLeague = 'mlb'): Promise<GameDetail | null> {
        const context = await this.sportsProvider.getGameContext(gamePk, env.defaultSeason(), league)
        if (!context) return null

        const [record] = await this.toRecords([{ league, context }])
        return {
            game: record,
            weather: context.weather,
            probablePitchers: {
                home: toPitcherSummary(context.probablePitchers.home),
                away: toPitcherSummary(context.probablePitchers.away),
            },
            lineupsPosted: context.lineupsPosted,
            estimate: record.estimate,
        }
    }

    // One failing league must not blank the page; only a total failure is an error.
    private async loadSchedule(range: { startDateUtc: Date; endDateUtc: Date }): Promise<LeagueGame[]> {
        const results = await Promise.allSettled(
            GAME_LEAGUES.map(async (league) =>
                (await this.sportsProvider.getGameContexts({ ...range, league })).map((context) => ({
                    league,
                    context,
                })),
            ),
        )
        const failed = results.filter((r) => r.status === 'rejected')
        if (failed.length === results.length) throw failed[0].reason
        return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
    }

    // Only MLB has standings; other leagues fall back to the schedule's own records.
    // A standings outage must not blank the page either.
    private async loadStandings(): Promise<Map<number, ProviderTeamStanding>> {
        try {
            const rows = await this.sportsProvider.getTeamStandings(env.defaultSeason())
            return new Map(rows.map((row) => [row.teamId, row]))
        } catch {
            return new Map()
        }
    }

    private async toRecords(games: LeagueGame[]): Promise<UpcomingGameRecord[]> {
        if (games.length === 0) return []

        const leagues = [...new Set(games.map((g) => g.league))]
        const [teamLists, mlbStandings] = await Promise.all([
            Promise.all(leagues.map((league) => this.sportsProvider.getTeams({ league }))),
            leagues.includes('mlb') ? this.loadStandings() : Promise.resolve(new Map<number, ProviderTeamStanding>()),
        ])
        const teamByKey = new Map(
            leagues.flatMap((league, i) => teamLists[i].map((team) => [`${league}:${team.id}`, team] as const)),
        )
        const noStandings = new Map<number, ProviderTeamStanding>()

        const side = (league: GameLeague, id: number) => {
            const team = teamByKey.get(`${league}:${id}`)
            return team
                ? { id: team.id, name: team.name, teamName: team.teamName, abbreviation: team.abbreviation }
                : { id, name: 'Unknown', teamName: null, abbreviation: 'UNK' }
        }

        return games.map(({ league, context }) => {
            const g = context.game
            return {
                gamePk: g.gamePk,
                gameDateUtc: g.gameDateUtc,
                status: g.status,
                leagueSlug: league,
                homeTeam: side(league, g.homeTeamId),
                awayTeam: side(league, g.awayTeamId),
                venueName: context.venue?.name ?? teamByKey.get(`${league}:${g.homeTeamId}`)?.venueName ?? null,
                homeScore: g.homeScore,
                awayScore: g.awayScore,
                homeProbablePitcher: context.probablePitchers.home?.fullName ?? null,
                awayProbablePitcher: context.probablePitchers.away?.fullName ?? null,
                estimate:
                    g.status === 'SCHEDULED'
                        ? estimateContext(context, league === 'mlb' ? mlbStandings : noStandings)
                        : null,
            }
        })
    }
}

function estimateContext(
    context: ProviderGameContext,
    standings: Map<number, ProviderTeamStanding>,
): GameEstimate {
    const g = context.game
    return estimateGame({
        gamePk: g.gamePk,
        home: teamStrengthFor(g.homeTeamId, standings, context.records.home),
        away: teamStrengthFor(g.awayTeamId, standings, context.records.away),
        homeStarter: starterStrengthFrom(context.probablePitchers.home),
        awayStarter: starterStrengthFrom(context.probablePitchers.away),
    })
}

function toPitcherSummary(pitcher: ProviderPlayer | null): PitcherSummary | null {
    if (!pitcher) return null
    return {
        id: pitcher.id,
        fullName: pitcher.fullName,
        throws: pitcher.throws,
        era: num(pitcher.pitchingStats?.era),
        inningsPitched: innings(pitcher.pitchingStats?.inningsPitched),
    }
}
