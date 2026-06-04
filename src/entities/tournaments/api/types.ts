// DTO shapes mirror the canonical contract returned by /api/tournaments.
// These never leak past the api/ folder — UI and hooks see TournamentRecord only.

import type {
    TournamentStatus,
    TournamentVisibility,
} from '@/shared/tournaments'

export interface TournamentDto {
    id: string
    name: string
    leagueSlug: string
    visibility: TournamentVisibility
    status: TournamentStatus
    startsAt: string
    endsAt: string
    totalWeeks: number
    currentWeek: number
    entryFeeCredits: number
    prizePoolCredits: number
    memberCount: number
}

export interface TournamentsListDto {
    items: TournamentDto[]
    total: number
    limit: number
    offset: number
}

export interface TournamentStandingRowDto {
    rank: number
    leagueMemberId: string
    fantasyTeamId: string
    userId: string
    teamName: string
    userName: string
    wins: number
    losses: number
    totalPoints: number
}

export interface TournamentStandingsDto {
    tournamentId: string
    currentWeek: number
    totalWeeks: number
    items: TournamentStandingRowDto[]
}
