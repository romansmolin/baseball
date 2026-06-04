import type {
    JoinTournamentPayload,
    JoinTournamentResult,
} from '@/shared/tournaments'

// DTO mirrors. The route handler's POST body and 201 response share the
// same shape as the domain models for now — we still ship a DTO layer so
// future API evolution (e.g. snake_case from a backend rewrite) is a
// single-mapper change instead of a slice-wide refactor.
export interface JoinTournamentDto {
    fantasyTeamId: string
}

export interface JoinTournamentResultDto {
    leagueMemberId: string
    tournamentId: string
    fantasyTeamId: string
}

export type { JoinTournamentPayload, JoinTournamentResult }
