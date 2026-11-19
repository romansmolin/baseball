import type { GameDetail, PitcherSummary } from '../../../src/shared/analytics'
import type { GameEstimate } from '../../../src/shared/estimates'
import type { UpcomingGameRecord } from '../../../src/shared/games'
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

export class GamesService implements IGamesService {
    private readonly sportsProvider: ISportsProvider

    constructor(sportsProvider: ISportsProvider) {
        this.sportsProvider = sportsProvider
    }

    async getUpcomingGames(limit: number): Promise<UpcomingGameRecord[]> {
        const now = new Date()
        const end = new Date(now.getTime() + UPCOMING_WINDOW_DAYS * MS_PER_DAY)

        const contexts = await this.sportsProvider.getGameContexts({
            startDateUtc: now,
            endDateUtc: end,
            league: 'mlb',
        })

        const upcoming = contexts
            .filter(({ game: g }) => g.status !== 'FINAL' && g.status !== 'CANCELLED')
            .filter(({ game: g }) => new Date(g.gameDateUtc).getTime() >= now.getTime() - 60 * 60 * 1000)
            .sort((a, b) => a.game.gameDateUtc.localeCompare(b.game.gameDateUtc))
            .slice(0, limit)

        return this.toRecords(upcoming)
    }

    async getGameDetail(gamePk: number): Promise<GameDetail | null> {
        const context = await this.sportsProvider.getGameContext(gamePk)
        if (!context) return null

        const [record] = await this.toRecords([context])
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

    // A standings outage must not blank the page: estimates then fall back to the schedule's own records.
    private async loadStandings(): Promise<Map<number, ProviderTeamStanding>> {
        try {
            const rows = await this.sportsProvider.getTeamStandings(env.defaultSeason())
            return new Map(rows.map((row) => [row.teamId, row]))
        } catch {
            return new Map()
        }
    }

    private async toRecords(contexts: ProviderGameContext[]): Promise<UpcomingGameRecord[]> {
        if (contexts.length === 0) return []

        const [teams, standings] = await Promise.all([
            this.sportsProvider.getTeams({ league: 'mlb' }),
            this.loadStandings(),
        ])
        const teamById = new Map(teams.map((team) => [team.id, team]))

        const side = (id: number) => {
            const team = teamById.get(id)
            return team
                ? { id: team.id, name: team.name, teamName: team.teamName, abbreviation: team.abbreviation }
                : { id, name: 'Unknown', teamName: null, abbreviation: 'UNK' }
        }

        return contexts.map((context) => {
            const g = context.game
            return {
                gamePk: g.gamePk,
                gameDateUtc: g.gameDateUtc,
                status: g.status,
                leagueSlug: 'mlb',
                homeTeam: side(g.homeTeamId),
                awayTeam: side(g.awayTeamId),
                venueName: context.venue?.name ?? teamById.get(g.homeTeamId)?.venueName ?? null,
                homeScore: g.homeScore,
                awayScore: g.awayScore,
                homeProbablePitcher: context.probablePitchers.home?.fullName ?? null,
                awayProbablePitcher: context.probablePitchers.away?.fullName ?? null,
                estimate: g.status === 'SCHEDULED' ? estimateContext(context, standings) : null,
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
