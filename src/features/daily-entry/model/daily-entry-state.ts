import { FIELD_SLOTS, SALARY_CAP_DEFAULT, slotAcceptsPoolPosition, type PoolPlayer, type Roster, type SlotKey } from '@/shared/team-builder'

export function getEntryReadiness(roster: Roster, pool: PoolPlayer[], captainId: number | null, locksAt: string, now: Date) {
    const ids = FIELD_SLOTS.map(slot => roster[slot.key]).filter((id): id is number => id != null)
    const byId = new Map(pool.map(player => [player.id, player]))
    const salaryUsed = ids.reduce((sum, id) => sum + (byId.get(id)?.salary ?? 0), 0)
    let reason: string | null = null
    if (!Number.isFinite(Date.parse(locksAt)) || now.getTime() >= Date.parse(locksAt)) reason = 'Lineups are locked.'
    else if (ids.length !== 9) reason = 'Fill all nine positions to enter.'
    else if (new Set(ids).size !== ids.length) reason = 'Each player can only appear once.'
    else if (FIELD_SLOTS.some(slot => { const player = byId.get(roster[slot.key] ?? -1); return !player || !slotAcceptsPoolPosition(slot.key, player.pos) })) reason = 'Choose an eligible player for every position.'
    else if (salaryUsed > SALARY_CAP_DEFAULT) reason = 'Your lineup exceeds the salary cap.'
    else if (captainId != null && !ids.includes(captainId)) reason = 'Choose a captain from your lineup.'
    return { canSave: reason == null, salaryUsed, filled: ids.length, reason }
}

export function replaceDailyPick(roster: Roster, slotKey: SlotKey, player: PoolPlayer, pool: PoolPlayer[], captainId: number | null): { roster: Roster; captainId: number | null } {
    const existing = roster[slotKey]
    if (!slotAcceptsPoolPosition(slotKey, player.pos) || Object.entries(roster).some(([key, id]) => key !== slotKey && id === player.id)) return { roster, captainId }
    const next = { ...roster, [slotKey]: player.id }
    const byId = new Map([...pool, player].map(p => [p.id, p]))
    const salary = Object.values(next).reduce<number>((sum, id) => sum + (id == null ? 0 : byId.get(id)?.salary ?? 0), 0)
    if (salary > SALARY_CAP_DEFAULT) return { roster, captainId }
    return { roster: next, captainId: existing === captainId && existing !== player.id ? null : captainId }
}
