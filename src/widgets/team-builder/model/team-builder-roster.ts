import {
    parseSlotId,
    slotAcceptsPoolPosition,
    type PoolPlayer,
    type Roster,
    type RosterSlotDef,
    type SlotKey,
} from '@/shared/team-builder'

export interface AutofillRosterPick {
    slotId: SlotKey
    externalPlayerId: number
}

interface MergeAutofillPicksInput {
    roster: Roster
    picks: AutofillRosterPick[]
    playersById: ReadonlyMap<number, PoolPlayer>
    slots: RosterSlotDef[]
}

export interface MergeAutofillPicksResult {
    roster: Roster
    assignedPicks: AutofillRosterPick[]
}

export type PlayerPlacement =
    | {
          allowed: true
          slot: RosterSlotDef
          replacedPlayerId: number | null
          nextSalary: number
      }
    | {
          allowed: false
          reason: 'duplicate' | 'no-slot' | 'over-budget'
      }

export const createEmptyRoster = (slots: RosterSlotDef[]): Roster =>
    Object.fromEntries(slots.map((slot) => [slot.id, null])) as Roster

// An exact position match is tried before UTIL, and UTIL before BENCH.
const FILL_ORDER: Record<string, number> = { UTIL: 1, BENCH: 2 }
const fillRank = (slot: RosterSlotDef) => FILL_ORDER[slot.type] ?? 0

/** Applies only resolved, eligible, unique AI picks to genuinely empty slots. */
export function mergeAutofillPicks({
    roster,
    picks,
    playersById,
    slots,
}: MergeAutofillPicksInput): MergeAutofillPicksResult {
    const next: Roster = { ...roster }
    const assignedPicks: AutofillRosterPick[] = []
    const rosteredIds = new Set(
        Object.values(roster).filter((id): id is number => id !== null),
    )

    for (const pick of picks) {
        const player = playersById.get(pick.externalPlayerId)
        if (!player || rosteredIds.has(player.id)) continue

        const requestedOpen =
            pick.slotId in next &&
            next[pick.slotId] == null &&
            slotAcceptsPoolPosition(pick.slotId, player.pos)
        const targetKey: SlotKey | null = requestedOpen
            ? pick.slotId
            : (findRosterSlotForPlayer(next, player, null, slots)?.id ?? null)
        if (targetKey == null) continue

        next[targetKey] = player.id
        rosteredIds.add(player.id)
        assignedPicks.push({ ...pick, slotId: targetKey })
    }

    return { roster: next, assignedPicks }
}

export function findRosterSlotForPlayer(
    roster: Roster,
    player: PoolPlayer,
    targetSlotKey: SlotKey | null,
    slots: RosterSlotDef[],
): RosterSlotDef | undefined {
    if (targetSlotKey != null) {
        const target = slots.find((slot) => slot.id === targetSlotKey)
        return target && slotAcceptsPoolPosition(target.id, player.pos)
            ? target
            : undefined
    }

    return slots
        .filter(
            (slot) =>
                roster[slot.id] === null &&
                slotAcceptsPoolPosition(slot.id, player.pos),
        )
        .sort((a, b) => fillRank(a) - fillRank(b))[0]
}

interface EvaluatePlayerPlacementInput {
    roster: Roster
    slots: RosterSlotDef[]
    player: PoolPlayer
    targetSlotKey: SlotKey | null
    salaryUsed: number
    // null when the format has no cap.
    salaryCap: number | null
    playerById: (id: number) => PoolPlayer | undefined
}

/** One validation result powers both the player-row disabled state and add/replace. */
export function evaluatePlayerPlacement({
    roster,
    slots,
    player,
    targetSlotKey,
    salaryUsed,
    salaryCap,
    playerById,
}: EvaluatePlayerPlacementInput): PlayerPlacement {
    if (Object.values(roster).includes(player.id)) {
        return { allowed: false, reason: 'duplicate' }
    }

    const slot = findRosterSlotForPlayer(roster, player, targetSlotKey, slots)
    if (!slot) return { allowed: false, reason: 'no-slot' }

    const replacedPlayerId = roster[slot.id]
    const replacedSalary =
        replacedPlayerId == null ? 0 : (playerById(replacedPlayerId)?.salary ?? 0)
    const nextSalary = salaryUsed - replacedSalary + (player.salary ?? 0)
    if (salaryCap !== null && nextSalary > salaryCap) {
        return { allowed: false, reason: 'over-budget' }
    }

    return { allowed: true, slot, replacedPlayerId, nextSalary }
}

/** Drops players whose slot no longer exists after the slot config changed. */
export function remapRoster(
    roster: Roster,
    nextSlots: RosterSlotDef[],
): { roster: Roster; droppedPlayerIds: number[] } {
    const next = createEmptyRoster(nextSlots)
    const droppedPlayerIds: number[] = []
    for (const [slotId, playerId] of Object.entries(roster)) {
        if (playerId == null) continue
        if (slotId in next && parseSlotId(slotId)) next[slotId] = playerId
        else droppedPlayerIds.push(playerId)
    }
    return { roster: next, droppedPlayerIds }
}
