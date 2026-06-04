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
import type { ScoringInputLeague } from '../scoring/weekly-scoring.service.interface'
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

        // Load the rule ONCE before iterating members — every member in the
        // league scores against the same rule, so we avoid N round-trips.
        let rule: Awaited<ReturnType<IScoringRuleRepository['findByLeagueId']>> = null
        if (currentWeek > 0) {
            rule = await this.scoringRuleRepository.findByLeagueId(tournament.id)
            if (!rule) {
                throw new ApiError(
                    500,
                    ErrorCode.SCORING_RULE_NOT_FOUND,
                    'Scoring rule not configured for tournament',
                )
            }
        }

        const scoringLeague: ScoringInputLeague = {
            id: tournament.id,
            startsAt: tournament.startsAt,
            totalWeeks: tournament.totalWeeks,
        }

        // Score, then sort stably (totalPoints DESC, leagueMemberId ASC on
        // ties — the standings table renders in this exact order).
        const scored = await Promise.all(
            members.map(async (member) => {
                if (currentWeek <= 0 || !rule) {
                    return { member, totalPoints: 0 }
                }

                // The scoring engine now reads frozen WeeklyLineup snapshots
                // internally — members without snapshots for a given week
                // resolve to a settled 0, no DRY guard needed here.
                await this.weeklyScoringService.prepareMemberWeeks(
                    member.id,
                    scoringLeague,
                    rule,
                    currentWeek,
                )

                const totalPoints = await this.weeklyScoringService.totalThroughWeek(
                    member.id,
                    currentWeek,
                )
                return { member, totalPoints }
            }),
        )

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

        return {
            tournamentId: tournament.id,
            currentWeek,
            totalWeeks: tournament.totalWeeks,
            items,
        }
    }
}
