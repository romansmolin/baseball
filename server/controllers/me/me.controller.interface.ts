export interface IMeController {
    getMyTeams(userId: string): Promise<Response>
    getBudget(userId: string): Promise<Response>
    createMyTeam(body: unknown, userId: string): Promise<Response>
    renameMyTeam(body: unknown, userId: string, teamId: string): Promise<Response>
    updateMyTeamLineup(
        body: unknown,
        userId: string,
        teamId: string,
    ): Promise<Response>
}
