export interface IMeController {
    getOnboarding(userId: string): Promise<Response>
    getCredits(userId: string): Promise<Response>
    getMetrics(userId: string): Promise<Response>
    getActivity(userId: string, searchParams: URLSearchParams): Promise<Response>
    getMyTeams(userId: string): Promise<Response>
    getBudget(userId: string): Promise<Response>
    createMyTeam(body: unknown, userId: string): Promise<Response>
    renameMyTeam(body: unknown, userId: string, teamId: string): Promise<Response>
    updateMyTeamLineup(
        body: unknown,
        userId: string,
        teamId: string,
    ): Promise<Response>
    getMyTournaments(userId: string): Promise<Response>
    getMyTournamentProgress(userId: string, tournamentId: string): Promise<Response>
}
