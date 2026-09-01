import type { Position } from '@/shared/sports'

import type { PoolPosition, SlotKey } from './types'

const SLOT_TO_POOL_POSITION: Record<SlotKey, PoolPosition> = {
    P: 'P',
    C: 'C',
    '1B': '1B',
    '2B': '2B',
    '3B': '3B',
    SS: 'SS',
    LF: 'OF',
    CF: 'OF',
    RF: 'OF',
}

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
    return SLOT_TO_POOL_POSITION[slotKey] === position
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
