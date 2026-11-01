import {isDeepStrictEqual} from 'node:util'
import { prisma } from '../../lib/prisma';
import type { DailyContest } from '../../../src/generated/prisma/client';
import type { DailyContestSummary, DailyGame, DailyPlayer, DailyEntryRecord, DailyEntrySlot, DailyContestDetail, SaveDailyEntryInput } from '@/shared/daily-contests';
import { validateDailyLineup, rankPoints } from '../../services/daily-contests/daily-rules';
import { ApiError } from '../../errors/api.error';
import { ErrorCode } from '../../errors/error-code.enum';
export function mapContest(row: DailyContest, count = 0): DailyContestSummary { return { id: row.id, name: row.name, mode: row.mode, status: row.status === 'OPEN' && row.locksAt <= new Date() ? 'LOCKED' : row.status, leagueSlug: row.leagueSlug, contestDate: row.contestDate, sourceDate: row.sourceDate, locksAt: row.locksAt.toISOString(), memberCount: count, salaryCap: row.salaryCap, updatedAt: row.updatedAt.toISOString() }; }
export function mapEntry(row: {
    id: string;
    contestId: string;
    userId: string;
    teamName: string;
    captainExternalPlayerId: number | null;
    lineup: unknown;
    points: unknown;
    isFinal: boolean;
    updatedAt: Date;
}): DailyEntryRecord { return { id: row.id, contestId: row.contestId, userId: row.userId, teamName: row.teamName, captainExternalPlayerId: row.captainExternalPlayerId, slots: row.lineup as DailyEntrySlot[], points: Number(row.points), isFinal: row.isFinal, updatedAt: row.updatedAt.toISOString() }; }
export class DailyContestsRepository {
    async list(filter: {
        mode?: 'LIVE' | 'REPLAY';
        leagueSlug?: string;
        status?: 'OPEN' | 'LOCKED' | 'COMPLETED' | 'CANCELLED';
        limit: number;
        offset: number;
    }) { const { limit, offset, status, ...rest } = filter; const now = new Date(); const where = { ...rest, ...(status === 'OPEN' ? { status: 'OPEN' as const, locksAt: { gt: now } } : status === 'LOCKED' ? { OR: [{ status: 'LOCKED' as const }, { status: 'OPEN' as const, locksAt: { lte: now } }] } : status ? { status } : {}) }; const [rows, total] = await prisma.$transaction([prisma.dailyContest.findMany({ where, include: { _count: { select: { entries: true } } }, orderBy: { contestDate: 'desc' }, take: limit, skip: offset }), prisma.dailyContest.count({ where })]); return { items: rows.map(r => mapContest(r, r._count.entries)), total, limit, offset }; }
    async detail(id: string): Promise<DailyContestDetail> { const r = await prisma.dailyContest.findUnique({ where: { id }, include: { _count: { select: { entries: true } } } }); if (!r)
        throw ApiError.notFound(ErrorCode.TOURNAMENT_NOT_FOUND, 'Contest not found'); return { ...mapContest(r, r._count.entries), players: r.playerPool as unknown as DailyPlayer[], games: r.games as unknown as DailyGame[], captainMultiplier: r.captainMultiplier }; }
    async myEntry(contestId: string, userId: string) { const row = await prisma.dailyEntry.findUnique({ where: { contestId_userId: { contestId, userId } } }); return row ? mapEntry(row) : null; }
    async save(userId: string, contestId: string, input: SaveDailyEntryInput) { for (let attempt = 0; attempt < 3; attempt++) {
        try {
            return await this.saveAttempt(userId, contestId, input);
        }
        catch (error) {
            if (attempt === 2 || !(error instanceof Error) || !('code' in error) || error.code !== 'P2034')
                throw error;
        }
    } throw ApiError.internal(); }
    private async saveAttempt(userId: string, contestId: string, input: SaveDailyEntryInput) {
        return prisma.$transaction(async (tx) => {
            await tx.$queryRaw `SELECT id FROM "DailyContest" WHERE id = ${contestId} FOR UPDATE`;
            const contest = await tx.dailyContest.findUnique({ where: { id: contestId } });
            if (!contest)
                throw ApiError.notFound(ErrorCode.TOURNAMENT_NOT_FOUND, 'Contest not found');
            if (contest.status !== 'OPEN' || contest.locksAt.getTime() <= Date.now())
                throw ApiError.conflict(ErrorCode.JOIN_WINDOW_CLOSED, 'Lineups are locked');
            const user = await tx.user.findUnique({ where: { id: userId }, select: { status: true } });
            if (!user || user.status !== 'ACTIVE')
                throw ApiError.unauthorized();
            const lineup = validateDailyLineup(input, contest.playerPool as unknown as DailyPlayer[], contest.salaryCap);
            const old = await tx.dailyEntry.findUnique({ where: { contestId_userId: { contestId, userId } } });
            const data = { teamName: input.teamName, captainExternalPlayerId: input.captainExternalPlayerId ?? null, lineup: JSON.parse(JSON.stringify(lineup)) };
            if (old && isDeepStrictEqual(old.lineup, data.lineup) && old.teamName === data.teamName && old.captainExternalPlayerId === data.captainExternalPlayerId)
                return mapEntry(old);
            const row = await tx.dailyEntry.upsert({ where: { contestId_userId: { contestId, userId } }, create: { ...data, contestId, userId }, update: { ...data, revision: { increment: 1 } } });
            await tx.communityEvent.create({ data: { sourceKey: `entry:${row.id}:${row.revision}`, kind: old ? 'LINEUP_UPDATED' : 'ENTRY_JOINED', userId, contestId, occurredAt: new Date(), payload: { detail: old ? 'Updated their lineup' : 'Joined a daily contest' } } });
            return mapEntry(row);
        }, { isolationLevel: 'Serializable' });
    }
    async entryForViewer(contestId: string, entryId: string, viewerId: string | null) { const row = await prisma.dailyEntry.findUnique({ where: { id: entryId }, include: { contest: true } }); if (!row || row.contestId !== contestId)
        throw ApiError.notFound(ErrorCode.TOURNAMENT_NOT_FOUND, 'Entry not found'); if (row.userId !== viewerId && row.contest.locksAt > new Date())
        throw new ApiError(403, ErrorCode.TEAM_NOT_OWNED, 'Lineups are private until lock'); return mapEntry(row); }
    async standings(contestId: string, limit: number, offset: number) { await this.detail(contestId); const rows = await prisma.dailyEntry.findMany({ where: { contestId }, include: { user: { select: { name: true, image: true, demoProfile: { select: { userId: true } } } } } }); const ranked = rankPoints(rows.map(r => ({ id: r.userId, points: Number(r.points), row: r }))); return { items: ranked.slice(offset, offset + limit).map(({ row: r, rank, points }) => ({ entryId: r.id, userId: r.userId, userName: r.user.name, image: r.user.image, isDemo: !!r.user.demoProfile, teamName: r.teamName, points, rank })), total: rows.length, limit, offset }; }
}
