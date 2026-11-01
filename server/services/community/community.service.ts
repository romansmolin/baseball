import {MlbSportsProvider} from '../../providers/mlb/mlb.provider'
import { prisma } from '../../lib/prisma';
import { Prisma } from '../../../src/generated/prisma/client';
import { dailyDate } from '../daily-contests/daily-rules';
import { mapContest } from '../../repositories/daily-contests/daily-contests.repository';
import { ApiError } from '../../errors/api.error';
import { ErrorCode } from '../../errors/error-code.enum';
import type { CommunityOverview, ManagerFilters, ManagerRow, ManagerProfile, CommunityActivity } from '@/shared/community';
export function periodStart(now: Date, period: string): string { const date = dailyDate(now); if (period === 'season')
    return `${date.slice(0, 4)}-01-01`; if (period === 'week') {
    const d = new Date(`${date}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    return d.toISOString().slice(0, 10);
} return date; }
export class CommunityService {
    async getCommunityOverview(now = new Date()): Promise<CommunityOverview> { const since = new Date(now.getTime() - 30 * 86400000); const [demoProfiles, realProfiles, active, participantsToday, contestsToday] = await Promise.all([prisma.demoProfile.count(), prisma.user.count({ where: { status: 'ACTIVE', demoProfile: null, provider: { not: 'demo' } } }), prisma.dailyEntry.findMany({ where: { createdAt: { gte: since, lte: now } }, distinct: ['userId'], select: { user: { select: { demoProfile: { select: { userId: true } } } } } }), prisma.dailyEntry.count({ where: { contest: { contestDate: dailyDate(now) }, createdAt: { lte: now } } }), prisma.dailyContest.count({ where: { contestDate: dailyDate(now) } })]); return { demoProfiles, realProfiles, activeDemo30Days: active.filter(r => !!r.user.demoProfile).length, activeReal30Days: active.filter(r => !r.user.demoProfile).length, participantsToday, contestsToday, updatedAt: now.toISOString() }; }
    async listManagers(filters: ManagerFilters = {}) {
        const mode = filters.mode ?? 'LIVE', period = filters.period ?? 'week', limit = filters.limit ?? 20, offset = filters.offset ?? 0, start = periodStart(new Date(), period);
        const rows = await prisma.$queryRaw<(ManagerRow & {
            entries: bigint;
            points: string;
            rank: bigint | null;
        })[]>(Prisma.sql `
 WITH totals AS (SELECT e."userId",SUM(e.points) points,COUNT(*) entries FROM "DailyEntry" e JOIN "DailyContest" c ON c.id=e."contestId" WHERE c.status='COMPLETED' AND e."isFinal"=true AND c.mode=${mode}::"DailyContestMode" AND c."contestDate">=${start} GROUP BY e."userId"), ranked AS (SELECT *,RANK() OVER(ORDER BY points DESC) rank FROM totals)
 SELECT u.id AS "userId",u.name,u.username,u.image,(d."userId" IS NOT NULL) AS "isDemo",d."countryCode",COALESCE(r.points,0)::text points,r.rank,s."previousRank",COALESCE(r.entries,0) entries FROM "User" u LEFT JOIN "DemoProfile" d ON d."userId"=u.id LEFT JOIN ranked r ON r."userId"=u.id LEFT JOIN "ManagerStanding" s ON s."userId"=u.id AND s.mode=${mode}::"DailyContestMode" AND s.period=${period} AND s."periodKey"=${start} WHERE u.status='ACTIVE' AND (d."userId" IS NOT NULL OR r."userId" IS NOT NULL) ORDER BY r.rank ASC NULLS LAST,u.id LIMIT ${limit} OFFSET ${offset}`);
        const total = await prisma.user.count({ where: { status: 'ACTIVE', OR: [{ demoProfile: { isNot: null } }, { dailyEntries: { some: { isFinal: true, contest: { mode, status: 'COMPLETED', contestDate: { gte: start } } } } }] } });
        return { items: rows.map(r => ({ ...r, points: Number(r.points), rank: r.rank === null ? null : Number(r.rank), entries: Number(r.entries) })), total, limit, offset };
    }
    async getManagerProfile(userId: string): Promise<ManagerProfile> { const u = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, username: true, image: true, status: true, createdAt: true, demoProfile: true, dailyEntries: { where: { contest: { status: 'COMPLETED' } }, orderBy: { createdAt: 'desc' }, take: 20, include: { contest: true } } } }); if (!u || u.status !== 'ACTIVE' || (!u.demoProfile && !u.dailyEntries.length))
        throw ApiError.notFound(ErrorCode.USER_NOT_FOUND, 'Manager not found'); const favoriteTeamName=u.demoProfile ? (await new MlbSportsProvider().getTeamById(u.demoProfile.favoriteTeamId).catch(()=>null))?.name??null : null; const totals = await prisma.dailyEntry.aggregate({ where: { userId, isFinal: true, contest: { status: 'COMPLETED' } }, _sum: { points: true }, _count: true }); return { userId: u.id, name: u.name, username: u.username, image: u.image, isDemo: !!u.demoProfile, countryCode: u.demoProfile?.countryCode ?? null, points: Number(totals._sum.points ?? 0), rank: null, previousRank: null, entries: totals._count, favoriteTeamId: u.demoProfile?.favoriteTeamId ?? null, favoriteTeamName, strategy: u.demoProfile?.strategy ?? null, joinedAt: u.createdAt.toISOString(), history: u.dailyEntries.map(e => ({ entryId: e.id, teamName: e.teamName, points: Number(e.points), contest: mapContest(e.contest) })) }; }
    async activity(limit = 20, cursor?: string): Promise<{
        items: CommunityActivity[];
        nextCursor: string | null;
    }> { const rows = await prisma.communityEvent.findMany({ where: { occurredAt: { lte: new Date() } }, orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }], take: limit + 1, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), include: { user: { select: { name: true, image: true, demoProfile: { select: { userId: true } } } }, contest: { select: { name: true } } } }); const more = rows.length > limit, items = rows.slice(0, limit).map(r => ({ id: r.id, kind: r.kind, userId: r.userId, userName: r.user?.name ?? 'BaseballFantasy', image: r.user?.image ?? null, isDemo: !!r.user?.demoProfile, contestId: r.contestId, contestName: r.contest?.name ?? null, occurredAt: r.occurredAt.toISOString(), detail: typeof r.payload === 'object' && r.payload !== null && 'detail' in r.payload ? String(r.payload.detail) : r.kind.toLowerCase().replaceAll('_', ' ') })); return { items, nextCursor: more ? items.at(-1)?.id ?? null : null }; }
}
