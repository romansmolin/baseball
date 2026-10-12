// Shared tournament contracts consumed by both Agent 1 (user-scoped:
// join + progress + my-tournaments) and Agent 2 (catalog: list +
// detail + standings). Domain models — never DTO shapes.
//
// We sit on top of the existing League/LeagueMember/LeagueMatchup tables.
// Status values are uppercase to mirror the underlying Prisma LeagueStatus
// enum so the UI can switch on them directly without a translation layer.

export type TournamentVisibility = 'PUBLIC' | 'PRIVATE'

// Mirrors Prisma LeagueStatus 1:1 so the UI can switch on it directly.
export type TournamentStatus =
    | 'DRAFTING'
    | 'IN_SEASON'
    | 'PLAYOFFS'
    | 'COMPLETED'
    | 'ARCHIVED'

export interface TournamentRecord {
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

export interface TournamentsListResponse {
    items: TournamentRecord[]
    total: number
    limit: number
    offset: number
}

export interface TournamentsListFilters {
    leagueSlug?: string
    status?: TournamentStatus[]
    visibility?: TournamentVisibility[]
    limit?: number
    offset?: number
}

export interface TournamentStandingRow {
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

export interface TournamentStandingsResponse {
    tournamentId: string
    currentWeek: number
    totalWeeks: number
    items: TournamentStandingRow[]
}

// User-scoped contract types — co-located with the catalog contract so the
// shape stays canonical across both halves of the tournaments domain.
// Agent 1 owns the endpoints/UI that produce and consume these.

export interface UserTournamentGameScore {
    gamePk: number
    points: number
    status: string
}

export interface UserTournamentSlotScore {
    externalPlayerId: number
    playerName: string
    slotPosition: string
    isCaptain: boolean
    // Points before the captain multiplier.
    rawPoints: number
    finalPoints: number
    games: UserTournamentGameScore[]
}

export interface UserTournamentWeeklyScore {
    week: number
    points: number
    awarded: boolean
    slots: UserTournamentSlotScore[]
}

export interface UserTournamentProgress {
    tournamentId: string
    tournamentName: string
    leagueSlug: string
    status: TournamentStatus
    leagueMemberId: string
    fantasyTeamId: string | null
    fantasyTeamName: string | null
    currentWeek: number
    totalWeeks: number
    totalPoints: number
    rank: number
    memberCount: number
    weeklyScores: UserTournamentWeeklyScore[]
}

export interface JoinTournamentPayload {
    fantasyTeamId: string
}

export interface JoinTournamentResult {
    leagueMemberId: string
    tournamentId: string
    fantasyTeamId: string
}

// Runtime constants — useful for Zod enum coercion and toolbar filter buttons.
export const TOURNAMENT_STATUS_SLUGS: readonly TournamentStatus[] = [
    'DRAFTING',
    'IN_SEASON',
    'PLAYOFFS',
    'COMPLETED',
    'ARCHIVED',
] as const

export const TOURNAMENT_VISIBILITY_SLUGS: readonly TournamentVisibility[] = [
    'PUBLIC',
    'PRIVATE',
] as const
