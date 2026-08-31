import { ApiError } from '../../errors/api.error'
import { ErrorCode } from '../../errors/error-code.enum'
import type { ITournamentsRepository } from '../../repositories/tournaments/tournaments.repository.interface'
import type { IScoringRuleRepository } from '../../repositories/scoring-rule/scoring-rule.repository.interface'
import type {
    TournamentRecord,
    TournamentStandingRow,
    TournamentStandingsResponse,
    TournamentsListResponse,
} from '@/shared/tournaments'

import type { IWeeklyScoringService } from '../scoring/weekly-scoring.service.interface'
import { computeTournamentCurrentWeek } from './tournament-week.util'
import { mapTournamentToRecord } from './tournaments.mapper'
import type {
    ITournamentsService,
    ListTournamentsInput,
} from './tournaments.service.interface'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200
const DEFAULT_OFFSET = 0

// Joinable first, then live, then finished. Within each bucket the SQL order
// (startsAt ASC) is preserved.
const STATUS_PRIORITY: Record<string, number> = {
    DRAFTING: 0,
    IN_SEASON: 1,
    PLAYOFFS: 2,
    COMPLETED: 3,
    ARCHIVED: 4,
}

export class TournamentsService implements ITournamentsService {
    private readonly tournamentsRepository: ITournamentsRepository
    private readonly weeklyScoringService: IWeeklyScoringService
    private readonly scoringRuleRepository: IScoringRuleRepository

    constructor(
        tournamentsRepository: ITournamentsRepository,
        weeklyScoringService: IWeeklyScoringService,
        scoringRuleRepository: IScoringRuleRepository,
    ) {
        this.tournamentsRepository = tournamentsRepository
        this.weeklyScoringService = weeklyScoringService
        this.scoringRuleRepository = scoringRuleRepository
    }

    async listTournaments(input: ListTournamentsInput): Promise<TournamentsListResponse> {
        const limit = Math.min(MAX_LIMIT, input.limit ?? DEFAULT_LIMIT)
        const offset = input.offset ?? DEFAULT_OFFSET

        const { items, total } = await this.tournamentsRepository.list({
            leagueSlug: input.leagueSlug,
            status: input.status,
            visibility: input.visibility,
            limit,
            offset,
        })

        const mapped = items.map(mapTournamentToRecord)
        mapped.sort((a, b) => {
            const pa = STATUS_PRIORITY[a.status] ?? 99
            const pb = STATUS_PRIORITY[b.status] ?? 99
            return pa - pb
        })

        return {
            items: mapped,
            total,
            limit,
            offset,
        }
    }

    async getTournamentById(id: string): Promise<TournamentRecord> {
        const row = await this.tournamentsRepository.findById(id)
        if (!row) {
            throw new ApiError(
                404,
                ErrorCode.TOURNAMENT_NOT_FOUND,
                `Tournament not found: ${id}`,
            )
        }
        return mapTournamentToRecord(row)
    }

    async getTournamentStandings(id: string): Promise<TournamentStandingsResponse> {
        const tournament = await this.tournamentsRepository.findById(id)
        if (!tournament) {
            throw new ApiError(
                404,
                ErrorCode.TOURNAMENT_NOT_FOUND,
                `Tournament not found: ${id}`,
            )
        }

        const currentWeek = computeTournamentCurrentWeek({
            status: tournament.status,
            startsAt: tournament.startsAt,
            totalWeeks: tournament.totalWeeks,
        })

        const members = await this.tournamentsRepository.findStandingsMembers(id)

        const memberIds = members.map((member) => member.id)
        // GET standings is intentionally read-only. The scoring cron owns
        // materialization; missing weeks contribute zero until it catches up.
        const totals = await this.weeklyScoringService.totalsThroughWeek(
            memberIds,
            currentWeek,
        )
        const scored = members.map((member) => {
            if (currentWeek <= 0) {
                return { member, totalPoints: 0 }
            }
            return { member, totalPoints: totals.get(member.id) ?? 0 }
        })

        scored.sort((a, b) => {
            if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints
            return a.member.id.localeCompare(b.member.id)
        })

        const items: TournamentStandingRow[] = scored.map(({ member, totalPoints }, index) => ({
            rank: index + 1,
            leagueMemberId: member.id,
            fantasyTeamId: member.fantasyTeam?.id ?? '',
            userId: member.user.id,
            teamName: member.fantasyTeam?.name ?? 'Unnamed team',
            userName: member.user.name,
            wins: member.wins,
            losses: member.losses,
            totalPoints,
        }))

        const response = {
            tournamentId: tournament.id,
            currentWeek,
            totalWeeks: tournament.totalWeeks,
            items,
        }
        return response
    }
}
