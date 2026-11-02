import type { ISportsProvider, ProviderGameRoster } from '../../../providers/sports-provider.interface'
import type { ProviderPlayer } from '../../../providers/dto/provider-player.dto'
import type { ProviderBoxScore, ProviderScheduledGame, GetScheduleFilters } from '../../../providers/dto/provider-schedule.dto'
import type { DailyPlayer } from '@/shared/daily-contests'

const positions = ['P', 'C', '1B', '2B', '3B', 'SS', 'OF', 'OF', 'OF'] as const
export const pool: DailyPlayer[] = positions.map((position, index) => ({ externalPlayerId: index + 1, name: `Player ${index + 1}`, position, teamId: 1, teamName: 'Original Club', salary: 4000 + ((index + 1) % 7) * 1000, photoUrl: null }))
export const game: ProviderScheduledGame = { gamePk: 1934000001, gameDateUtc: '2091-11-06T20:00:00Z', homeTeamId: 1, awayTeamId: 2, status: 'SCHEDULED', doubleHeader: false, homeScore: null, awayScore: null }
export const box: ProviderBoxScore = { gamePk: game.gamePk, status: 'FINAL', batters: [{ externalPlayerId: 2, hits: 2, doubles: 0, triples: 0, homeRuns: 1, rbi: 2, runs: 1, stolenBases: 0, baseOnBalls: 1, strikeOuts: 0 }], pitchers: [{ externalPlayerId: 1, inningsPitched: 6, strikeOuts: 5, earnedRuns: 1, win: true }] }

export class FixtureProvider implements ISportsProvider {
    readonly name = 'fixture'
    games = [game]
    unavailableTeam: number | null = null
    rosterReads = 0
    boxReads = 0
    seasons = new Set<number>()
    afterRosterRead = () => {}
    async getSchedule(filters: GetScheduleFilters) {
        if (filters.league !== 'winter-leagues') return []
        if (filters.season) this.seasons.add(filters.season)
        return this.games.filter(g => new Date(g.gameDateUtc) >= filters.startDateUtc && new Date(g.gameDateUtc) <= filters.endDateUtc)
    }
    async getTeams() { return [{ id: 1, name: 'Original Club', teamName: 'Original Club', venueName: null, abbreviation: 'OLD', locationName: null, league: null, division: null, active: true }, { id: 2, name: 'Visitors', teamName: 'Visitors', venueName: null, abbreviation: 'VIS', locationName: null, league: null, division: null, active: true }] }
    async getTeamById(id: number) { return (await this.getTeams()).find(t => t.id === id) ?? null }
    async getPlayers() { return { items: [], total: 0, limit: 10, offset: 0 } }
    async getPlayerById() { return null }
    async getPlayersByIds() { return [] }
    async getPlayersByTeam(teamId: number): Promise<ProviderPlayer[]> {
        this.rosterReads++
        this.afterRosterRead()
        if (teamId === this.unavailableTeam) return []
        return pool.map((p, index) => ({ id: teamId === 1 ? p.externalPlayerId : index + 101, fullName: p.name, firstName: 'Player', lastName: String(index), primaryPosition: p.position === 'P' ? 'SP' : p.position, teamId, teamName: teamId === 1 ? 'Original Club' : 'Visitors', teamAbbreviation: null, birthDate: null, age: null, bats: null, throws: null, jerseyNumber: null, photoUrl: null, active: true }))
    }
    async getGameRoster(gamePk: number): Promise<ProviderGameRoster> { return { gamePk, players: pool } }
    async getBoxScore(gamePk: number): Promise<ProviderBoxScore | null> { this.boxReads++; return { ...box, gamePk } }
}
