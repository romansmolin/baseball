import type {
    BuilderBudget,
    CreateTeamPayload,
    CreateTeamResult,
    UpdateLineupPayload,
} from '@/shared/team-builder'
import type { MyTeamsPayload, Team } from '@/shared/teams'

export interface IMeService {
    getMyTeams(userId: string): Promise<MyTeamsPayload>
    getBudget(userId: string): Promise<BuilderBudget>
    createMyTeam(userId: string, payload: CreateTeamPayload): Promise<CreateTeamResult>
    renameMyTeam(userId: string, teamId: string, name: string): Promise<Team>
    updateMyTeamLineup(
        userId: string,
        teamId: string,
        payload: UpdateLineupPayload,
    ): Promise<Team>
}
