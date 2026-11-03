import { FIELD_SLOTS, slotAcceptsPoolPosition } from '@/shared/team-builder';
import type { DailyPlayer, DailyEntrySlot, SaveDailyEntryInput } from '@/shared/daily-contests';
import type { ProviderBoxScore } from '../../providers/dto/provider-schedule.dto';
import type { BaseballScoringRule } from '../scoring/scoring-rule.schema';
import { scoreGameForPlayer } from '../scoring/scoring-engine';
import { ApiError } from '../../errors/api.error';
export function dailyDate(now: Date): string { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now); }
export function dailyDateOffset(now: Date, offset: number): string { const date = new Date(`${dailyDate(now)}T12:00:00.000Z`); date.setUTCDate(date.getUTCDate() + offset); return date.toISOString().slice(0, 10); }
export function validateDailyLineup(input: SaveDailyEntryInput, pool: DailyPlayer[], cap: number): DailyEntrySlot[] {
    if (input.players.length !== 9 || new Set(input.players.map(p => p.slotKey)).size !== 9 || new Set(input.players.map(p => p.externalPlayerId)).size !== 9)
        throw ApiError.validationError('Choose nine unique players and positions');
    const result = input.players.map(p => { const player = pool.find(x => x.externalPlayerId === p.externalPlayerId); if (!player || !FIELD_SLOTS.some(s => s.key === p.slotKey) || !slotAcceptsPoolPosition(p.slotKey, player.position))
        throw ApiError.validationError('Player is not eligible for this position'); return { slotKey: p.slotKey, player, rawPoints: 0, finalPoints: 0 }; });
    if (result.reduce((s, p) => s + p.player.salary, 0) > cap)
        throw ApiError.validationError('Salary cap exceeded');
    if (input.captainExternalPlayerId != null && !result.some(p => p.player.externalPlayerId === input.captainExternalPlayerId))
        throw ApiError.validationError('Captain must be in the lineup');
    return result;
}
export function canPublishPool(pool: DailyPlayer[], cap: number): boolean {
    const used = new Set<number>();
    let cost = 0;
    for (const slot of FIELD_SLOTS) {
        const player = pool.filter(p => !used.has(p.externalPlayerId) && slotAcceptsPoolPosition(slot.key, p.position)).sort((a, b) => a.salary - b.salary)[0];
        if (!player)
            return false;
        used.add(player.externalPlayerId);
        cost += player.salary;
    }
    return cost <= cap;
}
export function rankPoints<T extends {
    id: string;
    points: number;
}>(rows: T[]): (T & {
    rank: number;
})[] { let rank = 0; let previous: number | undefined; return [...rows].sort((a, b) => b.points - a.points || a.id.localeCompare(b.id)).map((r, i) => { if (previous !== r.points)
    rank = i + 1; previous = r.points; return { ...r, rank }; }); }
export function scoreDailyLineup(slots: DailyEntrySlot[], captain: number | null, boxes: ProviderBoxScore[], rule: BaseballScoringRule | Record<string, never>, multiplier: number): {
    slots: DailyEntrySlot[];
    points: number;
} { const next = slots.map(s => { const rawPoints = boxes.reduce((total, b) => total + scoreGameForPlayer(b, s.player.externalPlayerId, rule as BaseballScoringRule), 0); return { ...s, rawPoints, finalPoints: Math.round(rawPoints * (s.player.externalPlayerId === captain ? multiplier : 1) * 100) / 100 }; }); return { slots: next, points: Math.round(next.reduce((sum, p) => sum + p.finalPoints, 0) * 100) / 100 }; }
