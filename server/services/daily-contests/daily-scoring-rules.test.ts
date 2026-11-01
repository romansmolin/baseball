import { it, expect } from 'vitest';
import { scoreDailyLineup } from './daily-rules';
import { periodStart } from '../community/community.service';
import type { DailyEntrySlot } from '@/shared/daily-contests';
import type { BaseballScoringRule } from '../scoring/scoring-rule.schema';
const rule: BaseballScoringRule = { single: 1, double: 2, triple: 3, homeRun: 4, rbi: 1, runScored: 1, stolenBase: 1, walk: 1, strikeoutBatter: -1, inningPitched: 1, strikeoutPitcher: 1, win: 3, earnedRunAllowed: -1 };
const slot: DailyEntrySlot = { slotKey: 'P', player: { externalPlayerId: 1, name: 'Two Way', position: 'P', teamId: 1, teamName: 'Club', salary: 5000, photoUrl: null }, rawPoints: 0, finalPoints: 0 };
it('sums two-way contributions over a doubleheader before applying captain', () => { const box = { gamePk: 1, status: 'FINAL' as const, batters: [{ externalPlayerId: 1, hits: 1, doubles: 0, triples: 0, homeRuns: 0, rbi: 0, runs: 0, stolenBases: 0, baseOnBalls: 0, strikeOuts: 0 }], pitchers: [{ externalPlayerId: 1, inningsPitched: 2, strikeOuts: 1, earnedRuns: 0, win: false }] }; const result = scoreDailyLineup([slot], 1, [box, { ...box, gamePk: 2 }], rule, 1.5); expect(result.points).toBe(12); expect(result.slots[0].rawPoints).toBe(8); });
it('starts weekly rankings on New York Monday and seasons in January', () => { expect(periodStart(new Date('2026-11-02T04:30:00Z'), 'week')).toBe('2026-10-26'); expect(periodStart(new Date('2026-01-01T03:00:00Z'), 'season')).toBe('2025-01-01'); });
