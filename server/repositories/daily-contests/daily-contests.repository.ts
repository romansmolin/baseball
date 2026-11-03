import {isDeepStrictEqual} from 'node:util'
import { prisma } from '../../lib/prisma';
import type { DailyContest } from '../../../src/generated/prisma/client';
import type { DailyContestSummary, DailyGame, DailyPlayer, DailyEntryRecord, DailyEntrySlot, DailyContestDetail, MyActiveDailyEntry, SaveDailyEntryInput } from '@/shared/daily-contests';
import { validateDailyLineup, rankPoints } from '../../services/daily-contests/daily-rules';
import { ApiError } from '../../errors/api.error';
import { ErrorCode } from '../../errors/error-code.enum';
export function mapContest(row: DailyContest, count = 0): DailyContestSummary { return { id: row.id, name: row.name, mode: row.mode, status: row.status === 'OPEN' && row.locksAt <= new Date() ? 'LOCKED' : row.status, leagueSlug: row.leagueSlug, slateKey: row.slateKey, contestDate: row.contestDate, sourceDate: row.sourceDate, locksAt: row.locksAt.toISOString(), memberCount: count, salaryCap: row.salaryCap, updatedAt: row.updatedAt.toISOString() }; }
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
    async myActiveEntries(userId: string): Promise<MyActiveDailyEntry[]> {
        const now = new Date()
        const rows = await prisma.dailyEntry.findMany({
            where: { userId, contest: { mode: 'LIVE', status: { in: ['OPEN', 'LOCKED'] } } },
            orderBy: [{ contest: { locksAt: 'asc' } }, { id: 'asc' }],
            include: { contest: { select: { id: true, name: true, slateKey: true, leagueSlug: true, status: true, locksAt: true } } },
        })
        return rows.map(row => ({
            entryId: row.id,
            contestId: row.contest.id,
            contestName: row.contest.name,
            slateKey: row.contest.slateKey,
            leagueSlug: row.contest.leagueSlug,
            status: row.contest.status === 'OPEN' && row.contest.locksAt <= now ? 'LOCKED' : row.contest.status as 'OPEN' | 'LOCKED',
            locksAt: row.contest.locksAt.toISOString(),
        }))
    }

    async featured(): Promise<DailyContestSummary | null> {
        const now = new Date()
        const include = { _count: { select: { entries: true as const } } }
        const open = await prisma.dailyContest.findFirst({
            where: { mode: 'LIVE', status: 'OPEN', locksAt: { gt: now } },
            orderBy: [{ locksAt: 'asc' }, { id: 'asc' }],
            include,
        })
        const row = open ?? await prisma.dailyContest.findFirst({
            where: { mode: 'LIVE', OR: [{ status: 'LOCKED' }, { status: 'OPEN', locksAt: { lte: now } }] },
            orderBy: [{ locksAt: 'desc' }, { id: 'asc' }],
            include,
        })
        return row ? mapContest(row, row._count.entries) : null
    }

    async list(filter: {
        view?: 'current' | 'history';
        mode?: 'LIVE' | 'REPLAY';
        leagueSlug?: string;
        status?: 'OPEN' | 'LOCKED' | 'COMPLETED' | 'CANCELLED';
        limit: number;
        offset: number;
    }) { const { limit, offset, status, view: requestedView, ...rest } = filter; const view = requestedView ?? (filter.mode === 'REPLAY' ? 'history' : 'current'); const now = new Date(); const where = view === 'history'
        ? { ...rest, status: 'COMPLETED' as const }
        : { ...rest, mode: 'LIVE' as const, ...(status === 'OPEN' ? { status: 'OPEN' as const, locksAt: { gt: now } } : status === 'LOCKED' ? { OR: [{ status: 'LOCKED' as const }, { status: 'OPEN' as const, locksAt: { lte: now } }] } : { status: { in: ['OPEN', 'LOCKED'] as ('OPEN' | 'LOCKED')[] } }) }; const orderBy = view === 'current' ? [{ locksAt: 'asc' as const }, { id: 'asc' as const }] : [{ contestDate: 'desc' as const }, { id: 'asc' as const }]; const [rows, total] = await prisma.$transaction([prisma.dailyContest.findMany({ where, include: { _count: { select: { entries: true } } }, orderBy, take: limit, skip: offset }), prisma.dailyContest.count({ where })]); return { items: rows.map(r => mapContest(r, r._count.entries)), total, limit, offset }; }
    async detail(id: string): Promise<DailyContestDetail> { const r = await prisma.dailyContest.findUnique({ where: { id }, include: { _count: { select: { entries: true } } } }); if (!r || (r.mode === 'REPLAY' && r.status !== 'COMPLETED'))
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
            if (contest.mode === 'REPLAY' || contest.status !== 'OPEN' || contest.locksAt.getTime() <= Date.now())
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
        throw ApiError.notFound(ErrorCode.TOURNAMENT_NOT_FOUND, 'Entry not found'); if (row.userId !== viewerId && row.contest.status !== 'COMPLETED' && row.contest.locksAt > new Date())
        throw new ApiError(403, ErrorCode.TEAM_NOT_OWNED, 'Lineups are private until lock'); return mapEntry(row); }
    async standings(contestId: string, limit: number, offset: number) { await this.detail(contestId); const rows = await prisma.dailyEntry.findMany({ where: { contestId }, include: { user: { select: { name: true, image: true, demoProfile: { select: { userId: true } } } } } }); const ranked = rankPoints(rows.map(r => ({ id: r.userId, points: Number(r.points), row: r }))); return { items: ranked.slice(offset, offset + limit).map(({ row: r, rank, points }) => ({ entryId: r.id, userId: r.userId, userName: r.user.name, image: r.user.image, isDemo: !!r.user.demoProfile, teamName: r.teamName, points, rank })), total: rows.length, limit, offset }; }
}
