import { CreditTransactionType, LeagueStatus } from '../../../../src/generated/prisma/enums'
import { ApiError } from '../../../errors/api.error'
import { ErrorCode } from '../../../errors/error-code.enum'
import type { ICreditRepository } from '../../../repositories/credit/credit.repository.interface'
import type { IFantasyTeamRepository } from '../../../repositories/fantasy-team/fantasy-team.repository.interface'
import type { ILeagueMemberRepository } from '../../../repositories/league-member/league-member.repository.interface'
import type { ILeagueRepository } from '../../../repositories/league/league.repository.interface'
import type { IWeeklyLineupSnapshotService } from '../../weekly-lineup/weekly-lineup-snapshot.service.interface'

import type {
    ITournamentsJoinsService,
    JoinTournamentServiceInput,
    JoinTournamentServiceResult,
} from './tournaments-joins.service.interface'

// Statuses that block joining. Late joiners (IN_SEASON / PLAYOFFS) are allowed
// — their past weeks score 0 and the snapshot service stamps a row for the
// next un-locked week.
const NON_JOINABLE_STATUSES: ReadonlySet<LeagueStatus> = new Set([
    LeagueStatus.COMPLETED,
    LeagueStatus.ARCHIVED,
])

export class TournamentsJoinsService implements ITournamentsJoinsService {
    private readonly leagueRepository: ILeagueRepository
    private readonly leagueMemberRepository: ILeagueMemberRepository
    private readonly fantasyTeamRepository: IFantasyTeamRepository
    private readonly weeklyLineupSnapshotService: IWeeklyLineupSnapshotService
    private readonly creditRepository: ICreditRepository

    constructor(
        leagueRepository: ILeagueRepository,
        leagueMemberRepository: ILeagueMemberRepository,
        fantasyTeamRepository: IFantasyTeamRepository,
        weeklyLineupSnapshotService: IWeeklyLineupSnapshotService,
        creditRepository: ICreditRepository,
    ) {
        this.leagueRepository = leagueRepository
        this.leagueMemberRepository = leagueMemberRepository
        this.fantasyTeamRepository = fantasyTeamRepository
        this.weeklyLineupSnapshotService = weeklyLineupSnapshotService
        this.creditRepository = creditRepository
    }

    async joinTournament(
        input: JoinTournamentServiceInput,
    ): Promise<JoinTournamentServiceResult> {
        const tournament = await this.leagueRepository.findById(input.tournamentId)
        if (!tournament) {
            throw ApiError.notFound(
                ErrorCode.TOURNAMENT_NOT_FOUND,
                'Tournament not found',
            )
        }

        if (NON_JOINABLE_STATUSES.has(tournament.status)) {
            throw ApiError.conflict(
                ErrorCode.TOURNAMENT_NOT_JOINABLE,
                'Tournament is no longer accepting new members',
            )
        }

        // NOTE: no `startsAt` cutoff — mid-season joining is supported by
        // design. The snapshot service writes a row for the next un-locked
        // week so this member starts scoring from that week forward.

        const team = await this.fantasyTeamRepository.findById(input.fantasyTeamId)
        if (!team) {
            throw ApiError.notFound(ErrorCode.TEAM_NOT_FOUND, 'Fantasy team not found')
        }

        if (team.userId !== input.userId) {
            throw new ApiError(
                403,
                ErrorCode.TEAM_NOT_OWNED,
                'Fantasy team is not owned by the current user',
            )
        }

        if (team.leagueSlug !== tournament.leagueSlug) {
            throw ApiError.conflict(
                ErrorCode.LEAGUE_MISMATCH,
                "Selected team isn't in this tournament's league",
            )
        }

        if (team.leagueMemberId !== null) {
            throw ApiError.conflict(
                ErrorCode.TEAM_ALREADY_IN_LEAGUE,
                'Fantasy team is already in another tournament',
            )
        }

        const existingMembership =
            await this.leagueMemberRepository.findByLeagueAndUser(
                tournament.id,
                input.userId,
            )
        if (existingMembership) {
            throw ApiError.conflict(
                ErrorCode.USER_ALREADY_JOINED,
                "You've already joined this tournament",
            )
        }

        // Entry fee: check funds up front, debit after the member row exists.
        const entryFee = tournament.entryFeeCredits
        if (entryFee > 0) {
            const balance = await this.creditRepository.getBalance(input.userId)
            if (balance < entryFee) {
                throw new ApiError(
                    402,
                    ErrorCode.INSUFFICIENT_CREDITS,
                    `This tournament costs ${entryFee} credits to enter — you have ${balance}.`,
                )
            }
        }

        const member = await this.leagueMemberRepository.createAndLinkTeam({
            leagueId: tournament.id,
            userId: input.userId,
            fantasyTeamId: team.id,
        })

        if (entryFee > 0) {
            await this.creditRepository.grantCredits({
                userId: input.userId,
                amount: -entryFee,
                type: CreditTransactionType.TOURNAMENT_ENTRY_FEE,
                referenceType: 'tournament_entry',
                referenceId: member.id,
            })
        }

        // Snapshot the new member's lineup for the next un-locked week.
        // This is what gives mid-season joiners a real scoring footprint from
        // their first available week forward. Already-passed weeks remain
        // un-snapshotted → scoring engine reads 0 for them, by design.
        await this.weeklyLineupSnapshotService.snapshotForJoin(
            member.id,
            tournament.id,
        )

        return {
            leagueMemberId: member.id,
            tournamentId: tournament.id,
            fantasyTeamId: team.id,
        }
    }
}
