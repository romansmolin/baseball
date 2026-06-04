import type {
    JoinTournamentDto,
    JoinTournamentPayload,
    JoinTournamentResult,
    JoinTournamentResultDto,
} from './types'

export function mapJoinTournamentToDto(
    payload: JoinTournamentPayload,
): JoinTournamentDto {
    return {
        fantasyTeamId: payload.fantasyTeamId,
    }
}

export function mapJoinTournamentResultToModel(
    dto: JoinTournamentResultDto,
): JoinTournamentResult {
    return {
        leagueMemberId: dto.leagueMemberId,
        tournamentId: dto.tournamentId,
        fantasyTeamId: dto.fantasyTeamId,
    }
}
