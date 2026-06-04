'use client'

import { StarIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { FieldSlot } from './field-slot'
import type { FieldSlot as FieldSlotType, PoolPlayer, Roster, SlotKey } from '../model/team-builder.type'

interface FieldSlotsOverlayProps {
    slots: FieldSlotType[]
    roster: Roster
    captainId: number | null
    playerById: (id: number) => PoolPlayer | undefined
    onFocusEmpty: (slotKey: SlotKey) => void
    onRemove: (slotKey: SlotKey) => void
    onToggleCaptain: (id: number) => void
}

export const FieldSlotsOverlay = ({
    slots,
    roster,
    captainId,
    playerById,
    onFocusEmpty,
    onRemove,
    onToggleCaptain,
}: FieldSlotsOverlayProps) => (
    <>
        {slots.map((slot) => {
            const playerId = roster[slot.key]
            const player = playerId !== null ? (playerById(playerId) ?? null) : null
            return (
                <FieldSlot
                    key={slot.key}
                    slot={slot}
                    player={player}
                    isCaptain={playerId !== null && playerId === captainId}
                    onFocusEmpty={() => onFocusEmpty(slot.key)}
                    onRemove={() => onRemove(slot.key)}
                    onToggleCaptain={() => playerId !== null && onToggleCaptain(playerId)}
                />
            )
        })}
    </>
)

export const FieldHint = () => (
    <p className="mt-3 text-center text-xs text-muted-foreground">
        Tap a position to fill it from the pool · tap a player's{' '}
        <HugeiconsIcon icon={StarIcon} className="inline size-3.5 align-text-bottom" /> to make them
        captain (×1.5 pts)
    </p>
)
