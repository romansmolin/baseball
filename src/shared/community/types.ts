import type { DailyContestMode, DailyContestSummary } from '@/shared/daily-contests';
export interface CommunityOverview {
    demoProfiles: number;
    realProfiles: number;
    activeDemo30Days: number;
    activeReal30Days: number;
    participantsToday: number;
    contestsToday: number;
    updatedAt: string;
}
export interface CommunityActivity {
    id: string;
    kind: string;
    userId: string | null;
    userName: string;
    image: string | null;
    isDemo: boolean;
    contestId: string | null;
    contestName: string | null;
    occurredAt: string;
    detail: string;
}
export type ManagerPeriod = 'day' | 'week' | 'season';
export interface ManagerRow {
    userId: string;
    name: string;
    username: string | null;
    image: string | null;
    isDemo: boolean;
    countryCode: string | null;
    points: number;
    rank: number | null;
    previousRank: number | null;
    entries: number;
}
export interface ManagerProfile extends ManagerRow {
    /** How many managers have a season rank, for reading `rank` as "#12 of 1,500". */
    rankedManagers: number;
    favoriteTeamId: number | null;
    favoriteTeamName?: string | null;
    strategy: string | null;
    joinedAt: string;
    history: {
        entryId: string;
        teamName: string;
        points: number;
        contest: DailyContestSummary;
    }[];
}
export interface ManagerFilters {
    /** Leave out managers without a finished contest in the period. */
    rankedOnly?: boolean;
    mode?: DailyContestMode;
    period?: ManagerPeriod;
    limit?: number;
    offset?: number;
}
