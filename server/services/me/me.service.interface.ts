import type {
    ActivityEvent,
    CreditsSummary,
    DashboardMetrics,
    OnboardingStep,
} from '@/shared/dashboard'
import type {
    BuilderBudget,
    CreateTeamPayload,
    CreateTeamResult,
    UpdateLineupPayload,
} from '@/shared/team-builder'
import type { MyTeamsPayload, Team } from '@/shared/teams'
import type { TournamentRecord, UserTournamentProgress } from '@/shared/tournaments'

export interface IMeService {
    getOnboarding(userId: string): Promise<OnboardingStep[]>
    getCredits(userId: string): Promise<CreditsSummary>
    getMetrics(userId: string): Promise<DashboardMetrics>
    getActivity(userId: string, limit?: number): Promise<ActivityEvent[]>
    getMyTeams(userId: string): Promise<MyTeamsPayload>
    getBudget(userId: string): Promise<BuilderBudget>
    createMyTeam(userId: string, payload: CreateTeamPayload): Promise<CreateTeamResult>
    renameMyTeam(userId: string, teamId: string, name: string): Promise<Team>
    updateMyTeamLineup(
        userId: string,
        teamId: string,
        payload: UpdateLineupPayload,
    ): Promise<Team>
    getMyTournaments(userId: string): Promise<TournamentRecord[]>
    getMyTournamentProgress(
        userId: string,
        tournamentId: string,
    ): Promise<UserTournamentProgress>
}
