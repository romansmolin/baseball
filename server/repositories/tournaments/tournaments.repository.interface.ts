import type { LeagueStatus, LeagueVisibility } from '../../../src/generated/prisma/enums'
import type {
    LeagueMemberWithTeam,
    TournamentWithMemberCount,
} from '../../models/tournament/tournament.model'

export interface TournamentsListFilter {
    leagueSlug?: string
    status?: LeagueStatus[]
    visibility?: LeagueVisibility[]
    limit: number
    offset: number
}

export interface TournamentsListResult {
    items: TournamentWithMemberCount[]
    total: number
}

export interface ITournamentsRepository {
    list(filter: TournamentsListFilter): Promise<TournamentsListResult>
    findById(id: string): Promise<TournamentWithMemberCount | null>
    findStandingsMembers(leagueId: string): Promise<LeagueMemberWithTeam[]>
}
