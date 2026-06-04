export interface ITournamentsJoinsController {
    joinTournament(
        body: unknown,
        tournamentId: string,
        userId: string,
    ): Promise<Response>
}
