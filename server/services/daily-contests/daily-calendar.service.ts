import type {PrismaClient} from '../../../src/generated/prisma/client'
import {assertWorkTime} from '../showcase/work-deadline'
import { prisma } from '../../lib/prisma';
import { MlbSportsProvider } from '../../providers/mlb/mlb.provider';
import type { ISportsProvider } from '../../providers/sports-provider.interface';
import type { SupportedBaseballLeague } from '@/shared/baseball';
import type { DailyGame, DailyPlayer } from '@/shared/daily-contests';
import { providerPositionToPoolPosition } from '@/shared/team-builder';
import { canPublishPool, dailyDate } from './daily-rules';
export class DailyCalendarService {
    private readonly provider: ISportsProvider;
    private readonly db: PrismaClient;
    constructor(provider: ISportsProvider = new MlbSportsProvider(), db:PrismaClient=prisma) { this.provider = provider; this.db=db; }
    async loadReplayDay({ season, sourceDate }: {
        season: number;
        sourceDate: string;
    }) { const schedule = await this.provider.getSchedule({ startDateUtc: new Date(`${sourceDate}T00:00:00Z`), endDateUtc: new Date(`${sourceDate}T23:59:59Z`), season, league: 'mlb' }); const games = schedule.filter(g => g.status === 'FINAL'); const teams = await this.provider.getTeams({ season, league: 'mlb' }); const players: DailyPlayer[] = []; const boxScores = []; for (const game of games) {
        assertWorkTime();
        const roster = await this.provider.getGameRoster?.(game.gamePk);
        const box = await this.provider.getBoxScore(game.gamePk, { league: 'mlb' });
        if (!roster || !box || (!box.batters.length && !box.pitchers.length))
            throw new Error(`Incomplete archive game ${game.gamePk}`);
        players.push(...roster.players);
        boxScores.push(box);
    } const unique = [...new Map(players.map(p => [p.externalPlayerId, p])).values()]; return { sourceDate, games: games.map(g => ({ ...g, homeTeamName: teams.find(t => t.id === g.homeTeamId)?.name ?? 'Home', awayTeamName: teams.find(t => t.id === g.awayTeamId)?.name ?? 'Away' })), players: unique, boxScores }; }
    async publishDailyContests({ now, lookaheadDays = 3 }: {
        now: Date;
        lookaheadDays?: number;
    }) { const rule = await this.db.scoringRule.findFirst({ where: { isDefault: true } }); if (!rule)
        return { published: 0 }; let published = 0; for (const league of ['mlb', 'triple-a', 'double-a'] as SupportedBaseballLeague[]) {
        assertWorkTime();
        const season = now.getUTCFullYear(), end = new Date(now.getTime() + (lookaheadDays + 1) * 86400000);
        const games = await this.provider.getSchedule({ startDateUtc: now, endDateUtc: end, season, league });
        const teams = await this.provider.getTeams({ season, league });
        for (let n = 0; n < lookaheadDays; n++) {
            assertWorkTime();
            const date = dailyDate(new Date(now.getTime() + n * 86400000));
            const slate = games.filter(g => g.status === 'SCHEDULED' && dailyDate(new Date(g.gameDateUtc)) === date && new Date(g.gameDateUtc) > now);
            if (!slate.length)
                continue;
            const existing = await this.db.dailyContest.findUnique({ where: { mode_leagueSlug_contestDate_slateKey: { mode: 'LIVE', leagueSlug: league, contestDate: date, slateKey: 'classic' } } });
            if (existing)
                continue;
            const players: DailyPlayer[] = [];
            for (const teamId of new Set(slate.flatMap(g => [g.homeTeamId, g.awayTeamId]))) {
                assertWorkTime();
                for (const p of await this.provider.getPlayersByTeam(teamId, { season, league })) {
                    players.push({ externalPlayerId: p.id, name: p.fullName, position: providerPositionToPoolPosition(p.primaryPosition), teamId, teamName: p.teamName ?? teams.find(t => t.id === teamId)?.name ?? 'Club', salary: 4000 + (p.id % 7) * 1000, photoUrl: p.photoUrl });
                }
            }
            const pool = [...new Map(players.map(p => [p.externalPlayerId, p])).values()];
            if (!canPublishPool(pool, 80000))
                continue;
            const mapped: DailyGame[] = slate.map(g => ({ ...g, homeTeamName: teams.find(t => t.id === g.homeTeamId)?.name ?? 'Home', awayTeamName: teams.find(t => t.id === g.awayTeamId)?.name ?? 'Away' }));
            assertWorkTime(500);
            await this.db.dailyContest.upsert({ where: { mode_leagueSlug_contestDate_slateKey: { mode: 'LIVE', leagueSlug: league, contestDate: date, slateKey: 'classic' } }, create: { name: `${league.toUpperCase()} Daily Classic`, mode: 'LIVE', leagueSlug: league, contestDate: date, sourceDate: date, locksAt: new Date(Math.min(...slate.map(g => Date.parse(g.gameDateUtc)))), scoringRule: JSON.parse(JSON.stringify(rule.rules)), games: JSON.parse(JSON.stringify(mapped)), playerPool: JSON.parse(JSON.stringify(pool)) }, update: {} });
            published++;
        }
    } return { published }; }
}
