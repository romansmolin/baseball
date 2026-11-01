import { describe, it, expect } from 'vitest';
import { dailyDate, validateDailyLineup, rankPoints, scoreDailyLineup, canPublishPool } from './daily-rules';
import type { DailyPlayer } from '@/shared/daily-contests';
const positions = ['P', 'C', '1B', '2B', '3B', 'SS', 'OF', 'OF', 'OF'] as const;
const slots = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'] as const;
const pool: DailyPlayer[] = positions.map((position, i) => ({ externalPlayerId: i + 1, name: `Player ${i}`, position, teamId: 1, teamName: 'Club', salary: 5000, photoUrl: null }));
const input = { teamName: 'Nine', players: slots.map((slotKey, i) => ({ slotKey, externalPlayerId: i + 1 })) };
describe('daily rules', () => {
    it('uses New York date across spring and autumn DST', () => { expect(dailyDate(new Date('2026-03-08T04:30:00Z'))).toBe('2026-03-07'); expect(dailyDate(new Date('2026-11-01T05:30:00Z'))).toBe('2026-11-01'); });
    it('rejects untrusted duplicate players and incorrect positions', () => { expect(() => validateDailyLineup({ ...input, players: input.players.map(p => ({ ...p, externalPlayerId: 1 })) }, pool, 80000)).toThrow(); expect(() => validateDailyLineup({ ...input, players: input.players.map((p, i) => i === 0 ? { ...p, externalPlayerId: 2 } : p) }, pool, 80000)).toThrow(); });
    it('takes salary from pool and rejects excess budget', () => { expect(validateDailyLineup(input, pool, 80000)).toHaveLength(9); expect(() => validateDailyLineup(input, pool, 40000)).toThrow(); });
    it('requires captain to be in lineup', () => { expect(() => validateDailyLineup({ ...input, captainExternalPlayerId: 99 }, pool, 80000)).toThrow(); });
    it('checks three distinct outfielders before publishing', () => { expect(canPublishPool(pool, 80000)).toBe(true); expect(canPublishPool(pool.slice(0, 8), 80000)).toBe(false); });
    it('ranks ties 1,1,3 deterministically', () => { expect(rankPoints([{ id: 'b', points: 5 }, { id: 'c', points: 3 }, { id: 'a', points: 5 }])).toEqual([{ id: 'a', points: 5, rank: 1 }, { id: 'b', points: 5, rank: 1 }, { id: 'c', points: 3, rank: 3 }]); });
    it('does not invent final scores when box score missing', () => { const r = scoreDailyLineup(validateDailyLineup(input, pool, 80000), null, [], {}, 1.5); expect(r.points).toBe(0); expect(r.slots).toHaveLength(9); });
});
