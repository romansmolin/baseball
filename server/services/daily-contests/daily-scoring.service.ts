import type {PrismaClient} from '../../../src/generated/prisma/client'
import {assertWorkTime,remainingWorkMs,WorkDeadlineError} from '../showcase/work-deadline'
import { refreshManagerStandings } from '../community/manager-standings.service';
import { prisma } from '../../lib/prisma';
import { MlbSportsProvider } from '../../providers/mlb/mlb.provider';
import type { ISportsProvider } from '../../providers/sports-provider.interface';
import type { ProviderBoxScore } from '../../providers/dto/provider-schedule.dto';
import type { DailyEntrySlot, DailyGame } from '@/shared/daily-contests';
import type { BaseballProviderLeague } from '@/shared/baseball';
import { parseScoringRule } from '../scoring/scoring-rule.schema';
import { scoreDailyLineup } from './daily-rules';
import { loadDailySchedule, loadNorthAmericanContestSchedule } from './daily-schedule.service';
export class DailyScoringService {
    private readonly provider: ISportsProvider;
    private readonly db: PrismaClient;
    constructor(provider: ISportsProvider = new MlbSportsProvider(), db:PrismaClient=prisma) { this.provider = provider; this.db=db; }
    async refreshDailyScores(contestId: string, now = new Date()) {
        const contest = await this.db.dailyContest.findUnique({ where: { id: contestId } });
        if (!contest || ['COMPLETED', 'CANCELLED'].includes(contest.status) || contest.locksAt > now)
            return { complete: false, updatedAt: now.toISOString(), entriesUpdated: 0 };
        const deadline=Date.now()+20000;
        const boxes: ProviderBoxScore[] = [];
        let complete = true;
        let played = 0;
        let games = contest.games as unknown as DailyGame[];
        if (contest.mode === 'LIVE' && games.length) {
            try {
                const dates = games.map(game => Date.parse(game.gameDateUtc));
                const startDateUtc = new Date(Math.min(...dates));
                const endDateUtc = new Date(Math.max(...dates));
                const schedule = contest.leagueSlug === 'north-america'
                    ? await loadNorthAmericanContestSchedule(this.provider, { startDateUtc, endDateUtc, revalidateSeconds: 60 })
                    : await loadDailySchedule(this.provider, { startDateUtc, endDateUtc, league: contest.leagueSlug as BaseballProviderLeague, revalidateSeconds: 60 });
                const byId = new Map(schedule.map(row => [row.game.gamePk, row]));
                games = games.map(game => {
                    const fresh = byId.get(game.gamePk);
                    return fresh ? { ...game, sourceLeagueSlug: fresh.sourceLeagueSlug, status: fresh.game.status, homeScore: fresh.game.homeScore, awayScore: fresh.game.awayScore } : game;
                });
            } catch (error) { if (error instanceof WorkDeadlineError) throw error; }
        }
        for (const game of games) {
            assertWorkTime(500);
            if(Date.now()>=deadline){complete=false;break}
            if (contest.leagueSlug === 'north-america' && !game.sourceLeagueSlug) {
                complete = false
                continue
            }
            let saved = await this.db.dailyGameSnapshot.findUnique({ where: { gamePk: game.gamePk } });
            if (!saved?.complete && (!saved || now.getTime() - saved.observedAt.getTime() > 60000)) {
                try {
                    const sourceLeague = game.sourceLeagueSlug ?? contest.leagueSlug as BaseballProviderLeague;
                    const box = await this.provider.getBoxScore(game.gamePk, { deadline, league: sourceLeague });
                    if (box) {
                        const isComplete = box.status === 'CANCELLED' || box.status === 'FINAL' && box.batters.length > 0 && box.pitchers.length > 0;
                        saved = await this.db.dailyGameSnapshot.upsert({ where: { gamePk: game.gamePk }, create: { gamePk: game.gamePk, leagueSlug: sourceLeague, status: box.status, boxScore: JSON.parse(JSON.stringify(box)), complete: isComplete, observedAt: now }, update: { leagueSlug: sourceLeague, status: box.status, boxScore: JSON.parse(JSON.stringify(box)), complete: isComplete, observedAt: now } });
                    }
                }
                catch (error) {
                    if(error instanceof WorkDeadlineError)throw error;
                    complete = false;
                }
            }
            const expired = now.getTime() - Date.parse(game.gameDateUtc) > 72 * 3600000;
            if (saved?.status === 'CANCELLED' || saved?.status === 'POSTPONED' && expired)
                continue;
            if (!saved?.complete)
                complete = false;
            if (saved?.boxScore) {
                const box = saved.boxScore as unknown as ProviderBoxScore;
                if (box.status === 'FINAL' && (box.batters.length || box.pitchers.length))
                    played++;
                boxes.push(box);
            }
        }
        const rule = parseScoringRule(contest.scoringRule);
        const status = complete ? (played ? 'COMPLETED' : 'CANCELLED') : 'LOCKED';
        let entriesUpdated=0;
        assertWorkTime(1000);
        await this.db.$transaction(async (tx) => {
            await tx.$queryRaw `SELECT id FROM "DailyContest" WHERE id = ${contestId} FOR UPDATE`;
            const fresh = await tx.dailyContest.findUnique({ where: { id: contestId } });
            if (!fresh || ['COMPLETED', 'CANCELLED'].includes(fresh.status))
                return;
            const entries = await tx.dailyEntry.findMany({where:{contestId}});
            entriesUpdated=entries.length;
            const results = entries.map(entry => { const scored = scoreDailyLineup(entry.lineup as unknown as DailyEntrySlot[], entry.captainExternalPlayerId, boxes, rule, contest.captainMultiplier); return { id: entry.id, points: scored.points, lineup: scored.slots }; });
            if (results.length) {
                await tx.$executeRaw `UPDATE "DailyEntry" e SET points=r.points,lineup=r.lineup,"isFinal"=${status === 'COMPLETED'},"updatedAt"=${now} FROM jsonb_to_recordset(${JSON.stringify(results)}::jsonb) AS r(id text,points numeric,lineup jsonb) WHERE e.id=r.id AND e."contestId"=${contestId}`;
                await tx.communityEvent.createMany({ data: entries.map(entry => ({ sourceKey: `locked:${entry.id}`, kind: 'LINEUP_LOCKED', userId: entry.userId, contestId, occurredAt: contest.locksAt, payload: { detail: 'Lineup locked for the daily contest' } })), skipDuplicates: true });
            }
            await tx.dailyContest.update({ where: { id: contestId }, data: { status, games: JSON.parse(JSON.stringify(games)) } });
            if (status === 'COMPLETED')
                await tx.communityEvent.upsert({ where: { sourceKey: `completed:${contestId}` }, create: { sourceKey: `completed:${contestId}`, kind: 'CONTEST_COMPLETED', contestId, occurredAt: now, payload: { detail: `${contest.name} results are final` } }, update: {} });
        }, { timeout: Math.max(1,Math.min(60000,remainingWorkMs()-250)) });
        if (status === 'COMPLETED')
            await refreshManagerStandings(contest.mode, now, this.db);
        return { complete: status === 'COMPLETED', updatedAt: now.toISOString(), entriesUpdated };
    }
}
