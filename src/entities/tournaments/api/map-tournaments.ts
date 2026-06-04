import type {
    TournamentRecord,
    TournamentStandingRow,
    TournamentStandingsResponse,
    TournamentsListResponse,
} from '@/shared/tournaments'

import type {
    TournamentDto,
    TournamentStandingRowDto,
    TournamentStandingsDto,
    TournamentsListDto,
} from './types'

// DTO -> domain model. Pure functions; no React, no side effects.
// Today the API already returns the domain shape directly, but going through
// a mapper keeps the boundary explicit so the API and the frontend can evolve
// independently.

export function mapTournamentToRecord(dto: TournamentDto): TournamentRecord {
    return {
        id: dto.id,
        name: dto.name,
        leagueSlug: dto.leagueSlug,
        visibility: dto.visibility,
        status: dto.status,
        startsAt: dto.startsAt,
        endsAt: dto.endsAt,
        totalWeeks: dto.totalWeeks,
        currentWeek: dto.currentWeek,
        entryFeeCredits: dto.entryFeeCredits,
        prizePoolCredits: dto.prizePoolCredits,
        memberCount: dto.memberCount,
    }
}

export function mapTournamentsListToResponse(
    dto: TournamentsListDto,
): TournamentsListResponse {
    return {
        items: dto.items.map(mapTournamentToRecord),
        total: dto.total,
        limit: dto.limit,
        offset: dto.offset,
    }
}

function mapStandingRowToRecord(dto: TournamentStandingRowDto): TournamentStandingRow {
    return {
        rank: dto.rank,
        leagueMemberId: dto.leagueMemberId,
        fantasyTeamId: dto.fantasyTeamId,
        userId: dto.userId,
        teamName: dto.teamName,
        userName: dto.userName,
        wins: dto.wins,
        losses: dto.losses,
        totalPoints: dto.totalPoints,
    }
}

export function mapStandingsToResponse(
    dto: TournamentStandingsDto,
): TournamentStandingsResponse {
    return {
        tournamentId: dto.tournamentId,
        currentWeek: dto.currentWeek,
        totalWeeks: dto.totalWeeks,
        items: dto.items.map(mapStandingRowToRecord),
    }
}
