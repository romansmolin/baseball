import type {PrismaClient} from '../../../src/generated/prisma/client'
import {assertWorkTime} from '../showcase/work-deadline'
import { Prisma } from '../../../src/generated/prisma/client';
import { prisma } from '../../lib/prisma';
import { periodStart } from './community.service';
import type { DailyContestMode } from '@/shared/daily-contests';
export async function refreshManagerStandings(mode: DailyContestMode, now = new Date(), db:PrismaClient=prisma): Promise<void> {
    for (const period of ['day', 'week', 'season']) {
        assertWorkTime(500);
        const key = periodStart(now, period);
        await db.$executeRaw(Prisma.sql `WITH totals AS (SELECT e."userId",SUM(e.points) points,COUNT(*)::integer entries FROM "DailyEntry" e JOIN "DailyContest" c ON c.id=e."contestId" WHERE c.status='COMPLETED' AND e."isFinal"=true AND c.mode=${mode}::"DailyContestMode" AND c."contestDate">=${key} AND c."contestDate"<=${now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })} GROUP BY e."userId"), ranked AS (SELECT *,RANK() OVER(ORDER BY points DESC)::integer rank FROM totals) INSERT INTO "ManagerStanding" (id,"userId",mode,period,"periodKey",points,rank,"previousRank",entries,"updatedAt") SELECT md5("userId"||${mode}||${period}||${key}),"userId",${mode}::"DailyContestMode",${period},${key},points,rank,NULL,entries,${now} FROM ranked ON CONFLICT ("userId",mode,period,"periodKey") DO UPDATE SET "previousRank"=CASE WHEN "ManagerStanding".rank<>EXCLUDED.rank THEN "ManagerStanding".rank ELSE "ManagerStanding"."previousRank" END, rank=EXCLUDED.rank,points=EXCLUDED.points,entries=EXCLUDED.entries,"updatedAt"=EXCLUDED."updatedAt" WHERE "ManagerStanding".rank IS DISTINCT FROM EXCLUDED.rank OR "ManagerStanding".points IS DISTINCT FROM EXCLUDED.points OR "ManagerStanding".entries IS DISTINCT FROM EXCLUDED.entries`);
        // Only the top of the table: a feed event per moved manager would add tens of thousands of rows per contest.
        await db.$executeRaw(Prisma.sql `INSERT INTO "CommunityEvent" (id,"sourceKey",kind,"userId","contestId","occurredAt",payload) SELECT md5(s.id||s."updatedAt"::text),s.id||':'||s."updatedAt"::text,'RANK_CHANGED',s."userId",NULL,${now},jsonb_build_object('detail','Moved from #'||s."previousRank"::text||' to #'||s.rank::text||' in the '||${period}||' ranking') FROM "ManagerStanding" s WHERE s.mode=${mode}::"DailyContestMode" AND s.period=${period} AND s."periodKey"=${key} AND s."updatedAt"=${now} AND s."previousRank" IS NOT NULL AND s."previousRank"<>s.rank AND s.rank<=100 ON CONFLICT ("sourceKey") DO NOTHING`);
    }
}
