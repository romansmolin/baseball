import type {
    TournamentRecord,
    TournamentStandingsResponse,
    TournamentStatus,
    TournamentVisibility,
    TournamentsListResponse,
} from '@/shared/tournaments'

export interface ListTournamentsInput {
    leagueSlug?: string
    status?: TournamentStatus[]
    visibility?: TournamentVisibility[]
    limit?: number
    offset?: number
}

export interface ITournamentsService {
    listTournaments(input: ListTournamentsInput): Promise<TournamentsListResponse>
    getTournamentById(id: string): Promise<TournamentRecord>
    getTournamentStandings(id: string): Promise<TournamentStandingsResponse>
}
