import type { TopPerformer } from '@/shared/dashboard';
import type { DailyEntrySlot } from '@/shared/daily-contests';
import type { ISportsProvider } from '../../../providers/sports-provider.interface';
import type { TopPerformersQuery } from '../../../entities/performers/top.schema';
import type { ITopPerformersService } from './top-performers.service.interface';
import { prisma } from '../../../lib/prisma';
import { showcaseEnabled } from '../../../shared/showcase-config';
type PerformerSlot = {
    player: {
        externalPlayerId: number;
        name: string;
        position: string;
        teamName: string;
    };
    rawPoints: number;
};
export function rankDailyPerformers(slots: PerformerSlot[], limit: number): TopPerformer[] { const unique = new Map(slots.map(s => [s.player.externalPlayerId, s])); return [...unique.values()].sort((a, b) => b.rawPoints - a.rawPoints || a.player.externalPlayerId - b.player.externalPlayerId).slice(0, limit).map((s, i) => ({ id: String(s.player.externalPlayerId), rank: i + 1, name: s.player.name, position: s.player.position, team: s.player.teamName, fantasyPoints: s.rawPoints })); }
export class TopPerformersService implements ITopPerformersService {
    constructor(provider: ISportsProvider) { void provider; }
    async listTop(query: TopPerformersQuery): Promise<TopPerformer[]> { if (!showcaseEnabled())
        return []; const contest = await prisma.dailyContest.findFirst({ where: { mode: 'LIVE', status: 'COMPLETED' }, orderBy: { contestDate: 'desc' }, include: { entries: { select: { lineup: true } } } }); if (!contest)
        return []; return rankDailyPerformers(contest.entries.flatMap(e => e.lineup as unknown as DailyEntrySlot[]), query.limit ?? 5); }
}
