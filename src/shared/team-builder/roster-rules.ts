import type { Position } from '@/shared/sports'

import { parseSlotId, slotTypeAcceptsPosition } from './slots'
import type { PoolPosition, SlotKey } from './types'

/** The canonical provider-position normalization used by AI and manual picks. */
export function providerPositionToPoolPosition(position: Position): PoolPosition {
    if (position === 'SP' || position === 'RP') return 'P'
    if (position === 'DH') return 'OF'
    return position
}

export function slotAcceptsPoolPosition(
    slotKey: SlotKey,
    position: PoolPosition,
): boolean {
    const slot = parseSlotId(slotKey)
    return slot != null && slotTypeAcceptsPosition(slot.type, position)
}

export function slotAcceptsProviderPosition(
    slotKey: SlotKey,
    position: Position,
): boolean {
    return slotAcceptsPoolPosition(
        slotKey,
        providerPositionToPoolPosition(position),
    )
}
