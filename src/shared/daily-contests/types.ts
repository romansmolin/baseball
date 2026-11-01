import type { PoolPosition, SlotKey } from '@/shared/team-builder';
export type DailyContestMode = 'LIVE' | 'REPLAY';
export type DailyContestStatus = 'OPEN' | 'LOCKED' | 'COMPLETED' | 'CANCELLED';
export interface DailyPlayer {
    externalPlayerId: number;
    name: string;
    position: PoolPosition;
    teamId: number;
    teamName: string;
    salary: number;
    photoUrl: string | null;
}
export interface DailyGame {
    gamePk: number;
    gameDateUtc: string;
    homeTeamId: number;
    awayTeamId: number;
    homeTeamName: string;
    awayTeamName: string;
    status: string;
    homeScore: number | null;
    awayScore: number | null;
}
export interface DailyContestSummary {
    id: string;
    name: string;
    mode: DailyContestMode;
    status: DailyContestStatus;
    leagueSlug: string;
    contestDate: string;
    sourceDate: string;
    locksAt: string;
    memberCount: number;
    salaryCap: number;
    updatedAt: string;
}
export interface DailyContestDetail extends DailyContestSummary {
    players: DailyPlayer[];
    games: DailyGame[];
    captainMultiplier: number;
}
export interface SaveDailyEntryInput {
    teamName: string;
    players: {
        slotKey: SlotKey;
        externalPlayerId: number;
    }[];
    captainExternalPlayerId?: number | null;
}
export interface DailyEntrySlot {
    slotKey: SlotKey;
    player: DailyPlayer;
    rawPoints: number;
    finalPoints: number;
}
export interface DailyEntryRecord {
    id: string;
    contestId: string;
    userId: string;
    teamName: string;
    captainExternalPlayerId: number | null;
    slots: DailyEntrySlot[];
    points: number;
    isFinal: boolean;
    updatedAt: string;
}
export interface DailyStanding {
    entryId: string;
    userId: string;
    userName: string;
    image: string | null;
    isDemo: boolean;
    teamName: string;
    points: number;
    rank: number;
}
export interface Page<T> {
    items: T[];
    total: number;
    limit: number;
    offset: number;
}
