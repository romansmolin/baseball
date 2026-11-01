import { describe, expect, it } from 'vitest'
import { FIELD_SLOTS, type PoolPlayer, type Roster } from '@/shared/team-builder'
import { getEntryReadiness, replaceDailyPick } from '../daily-entry-state'

const pool: PoolPlayer[] = ['P', 'C', '1B', '2B', '3B', 'SS', 'OF', 'OF', 'OF'].map((pos, index) => ({
    id: index + 1, name: `Player ${index}`, pos: pos as PoolPlayer['pos'], team: 'Test',
    leagueSlug: 'mlb', leagueColor: '#ff7070', salary: 5000, proj: 0, photoUrl: null,
}))
const roster = (): Roster => ({ P: 1, C: 2, '1B': 3, '2B': 4, '3B': 5, SS: 6, LF: 7, CF: 8, RF: 9 })

describe('daily entry readiness', () => {
    it('allows a complete affordable roster before the lock', () => {
        expect(getEntryReadiness(roster(), pool, null, '2030-01-01T19:00:00Z', new Date('2030-01-01T18:59:59Z'))).toEqual({ canSave: true, salaryUsed: 45000, filled: 9, reason: null })
    })
    it('closes saving exactly at the lock even if the contest response is stale', () => {
        expect(getEntryReadiness(roster(), pool, 1, '2030-01-01T19:00:00Z', new Date('2030-01-01T19:00:00Z')).canSave).toBe(false)
    })
    it('rejects unresolved, duplicate, ineligible and over-budget picks', () => {
        expect(getEntryReadiness({ ...roster(), P: 100 }, pool, null, '2030-01-01T19:00:00Z', new Date('2030-01-01')).canSave).toBe(false)
        expect(getEntryReadiness({ ...roster(), CF: 7 }, pool, null, '2030-01-01T19:00:00Z', new Date('2030-01-01')).canSave).toBe(false)
        expect(getEntryReadiness({ ...roster(), C: 1, P: 2 }, pool, null, '2030-01-01T19:00:00Z', new Date('2030-01-01')).canSave).toBe(false)
        expect(getEntryReadiness(roster(), pool.map(p => ({ ...p, salary: 10000 })), null, '2030-01-01T19:00:00Z', new Date('2030-01-01')).canSave).toBe(false)
    })
    it('requires the captain to remain on the submitted roster', () => {
        expect(getEntryReadiness(roster(), pool, 100, '2030-01-01T19:00:00Z', new Date('2030-01-01')).canSave).toBe(false)
    })
    it('replaces a focused slot and preserves the other eight picks', () => {
        const next = replaceDailyPick(roster(), 'P', { ...pool[0], id: 10 }, pool, null)
        expect(next).toEqual({ roster: { ...roster(), P: 10 }, captainId: null })
        expect(FIELD_SLOTS.filter(slot => next.roster[slot.key] != null)).toHaveLength(9)
    })
    it('clears a captain when their player is replaced', () => {
        expect(replaceDailyPick(roster(), 'P', { ...pool[0], id: 10 }, pool, 1).captainId).toBeNull()
    })
    it('leaves the roster unchanged when a pick is already in another slot', () => {
        expect(replaceDailyPick(roster(), 'CF', pool[6], pool, null).roster).toEqual(roster())
    })
})
