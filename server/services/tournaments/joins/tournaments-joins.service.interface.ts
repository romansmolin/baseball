export interface JoinTournamentServiceInput {
    tournamentId: string
    userId: string
    fantasyTeamId: string
}

export interface JoinTournamentServiceResult {
    leagueMemberId: string
    tournamentId: string
    fantasyTeamId: string
}

export interface ITournamentsJoinsService {
    joinTournament(input: JoinTournamentServiceInput): Promise<JoinTournamentServiceResult>
}
