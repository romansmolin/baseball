export interface LeagueMemberRecord {
    id: string
    leagueId: string
    userId: string
    wins: number
    losses: number
    pointsFor: number
    createdAt: Date
    updatedAt: Date
}

export interface CreateLeagueMemberAndLinkTeamInput {
    leagueId: string
    userId: string
    fantasyTeamId: string
}

export interface ILeagueMemberRepository {
    findByLeagueAndUser(leagueId: string, userId: string): Promise<LeagueMemberRecord | null>
    findByUserId(userId: string): Promise<LeagueMemberRecord[]>
    findAllByLeagueId(leagueId: string): Promise<LeagueMemberRecord[]>
    createAndLinkTeam(
        input: CreateLeagueMemberAndLinkTeamInput,
    ): Promise<LeagueMemberRecord>
}
