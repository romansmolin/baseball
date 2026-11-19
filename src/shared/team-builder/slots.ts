import type { PoolPosition } from './types'

export const SLOT_TYPES = ['P', 'C', '1B', '2B', '3B', 'SS', 'OF', 'UTIL', 'BENCH'] as const
export type SlotType = (typeof SLOT_TYPES)[number]

export interface SlotConfigEntry {
    slot: SlotType
    count: number
}
export type SlotConfig = SlotConfigEntry[]

// `${SlotType}:${index}`, e.g. 'OF:2'.
export type SlotId = string

export interface RosterSlotDef {
    id: SlotId
    type: SlotType
    index: number
    label: string
}

// The classic 9-position lineup with one pitcher.
export const DEFAULT_SLOT_CONFIG: SlotConfig = [
    { slot: 'P', count: 1 },
    { slot: 'C', count: 1 },
    { slot: '1B', count: 1 },
    { slot: '2B', count: 1 },
    { slot: '3B', count: 1 },
    { slot: 'SS', count: 1 },
    { slot: 'OF', count: 3 },
]

export const toSlotId = (type: SlotType, index: number): SlotId => `${type}:${index}`

export function parseSlotId(id: SlotId): { type: SlotType; index: number } | null {
    const [type, rawIndex] = id.split(':')
    const index = Number(rawIndex)
    if (!(SLOT_TYPES as readonly string[]).includes(type) || !Number.isInteger(index) || index < 0) {
        return null
    }
    return { type: type as SlotType, index }
}

export function buildSlots(config: SlotConfig): RosterSlotDef[] {
    return config.flatMap(({ slot, count }) =>
        Array.from({ length: count }, (_, index) => ({
            id: toSlotId(slot, index),
            type: slot,
            index,
            label: count > 1 ? `${slot} ${index + 1}` : slot,
        })),
    )
}

export function slotTypeAcceptsPosition(type: SlotType, position: PoolPosition): boolean {
    if (type === 'BENCH') return true
    if (type === 'UTIL') return position !== 'P'
    return type === position
}
