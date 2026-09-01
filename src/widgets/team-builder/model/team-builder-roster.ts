import {
    FIELD_SLOTS,
    slotAcceptsPoolPosition,
    type FieldSlot,
    type PoolPlayer,
    type Roster,
    type SlotKey,
} from '@/shared/team-builder'

export interface AutofillRosterPick {
    slotKey: SlotKey
    externalPlayerId: number
}

interface MergeAutofillPicksInput {
    roster: Roster
    picks: AutofillRosterPick[]
    playersById: ReadonlyMap<number, PoolPlayer>
}

export interface MergeAutofillPicksResult {
    roster: Roster
    assignedPicks: AutofillRosterPick[]
}

export type PlayerPlacement =
    | {
          allowed: true
          slot: FieldSlot
          replacedPlayerId: number | null
          nextSalary: number
      }
    | {
          allowed: false
          reason: 'duplicate' | 'no-slot' | 'over-budget'
      }

/** Applies only resolved, eligible, unique AI picks to genuinely empty slots. */
export function mergeAutofillPicks({
    roster,
    picks,
    playersById,
}: MergeAutofillPicksInput): MergeAutofillPicksResult {
    const next: Roster = { ...roster }
    const assignedPicks: AutofillRosterPick[] = []
    const rosteredIds = new Set(
        Object.values(roster).filter((id): id is number => id !== null),
    )

    for (const pick of picks) {
        const player = playersById.get(pick.externalPlayerId)
        if (!player || rosteredIds.has(player.id)) continue

        let targetKey: SlotKey | null =
            next[pick.slotKey] == null &&
            slotAcceptsPoolPosition(pick.slotKey, player.pos)
                ? pick.slotKey
                : null
        if (targetKey == null) {
            targetKey =
                FIELD_SLOTS.find(
                    (slot) =>
                        next[slot.key] == null &&
                        slotAcceptsPoolPosition(slot.key, player.pos),
                )?.key ?? null
        }
        if (targetKey == null) continue

        next[targetKey] = player.id
        rosteredIds.add(player.id)
        assignedPicks.push({ ...pick, slotKey: targetKey })
    }

    return { roster: next, assignedPicks }
}

export function findRosterSlotForPlayer(
    roster: Roster,
    player: PoolPlayer,
    targetSlotKey: SlotKey | null = null,
): FieldSlot | undefined {
    if (targetSlotKey != null) {
        const target = FIELD_SLOTS.find((slot) => slot.key === targetSlotKey)
        return target && slotAcceptsPoolPosition(target.key, player.pos)
            ? target
            : undefined
    }

    return FIELD_SLOTS.find(
        (slot) =>
            roster[slot.key] === null &&
            slotAcceptsPoolPosition(slot.key, player.pos),
    )
}

interface EvaluatePlayerPlacementInput {
    roster: Roster
    player: PoolPlayer
    targetSlotKey: SlotKey | null
    salaryUsed: number
    salaryCap: number
    playerById: (id: number) => PoolPlayer | undefined
}

/** One validation result powers both the player-row disabled state and add/replace. */
export function evaluatePlayerPlacement({
    roster,
    player,
    targetSlotKey,
    salaryUsed,
    salaryCap,
    playerById,
}: EvaluatePlayerPlacementInput): PlayerPlacement {
    if (Object.values(roster).includes(player.id)) {
        return { allowed: false, reason: 'duplicate' }
    }

    const slot = findRosterSlotForPlayer(roster, player, targetSlotKey)
    if (!slot) return { allowed: false, reason: 'no-slot' }

    const replacedPlayerId = roster[slot.key]
    const replacedSalary =
        replacedPlayerId == null ? 0 : (playerById(replacedPlayerId)?.salary ?? 0)
    const nextSalary = salaryUsed - replacedSalary + player.salary
    if (nextSalary > salaryCap) {
        return { allowed: false, reason: 'over-budget' }
    }

    return { allowed: true, slot, replacedPlayerId, nextSalary }
}
