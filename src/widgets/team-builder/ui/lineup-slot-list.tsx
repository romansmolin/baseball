'use client'

import { Cancel01Icon, PlusSignIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import type { PoolPlayer, Roster, RosterSlotDef, SlotKey } from '@/shared/team-builder'
import { cn } from '@/shared/utils'

import { PlayerAvatar } from './player-pool-row'

interface LineupSlotListProps {
    slots: RosterSlotDef[]
    roster: Roster
    previewSlotIds: SlotKey[]
    targetSlotKey: SlotKey | null
    playerById: (id: number) => PoolPlayer | undefined
    onFocusSlot: (slotKey: SlotKey) => void
    onRemove: (slotKey: SlotKey) => void
}

// Lineup for custom slot configs (the diamond only fits the classic 9 positions).
export const LineupSlotList = ({
    slots,
    roster,
    previewSlotIds,
    targetSlotKey,
    playerById,
    onFocusSlot,
    onRemove,
}: LineupSlotListProps) => (
    <ul className="space-y-1.5">
        {slots.map((slot) => {
            const playerId = roster[slot.id]
            const player = playerId != null ? playerById(playerId) : undefined
            const isPreview = previewSlotIds.includes(slot.id)
            return (
                <li
                    key={slot.id}
                    className={cn(
                        'flex items-center gap-3 rounded-xl border px-3 py-2',
                        isPreview ? 'border-primary bg-primary/5' : 'border-foreground/10 bg-card',
                        targetSlotKey === slot.id && 'border-primary',
                    )}
                >
                    <span className="w-14 shrink-0 rounded bg-muted px-1.5 py-0.5 text-center text-[11px] font-semibold text-muted-foreground">
                        {slot.label}
                    </span>
                    {player ? (
                        <>
                            <PlayerAvatar name={player.name} photoUrl={player.photoUrl} leagueColor={player.leagueColor} size={28} />
                            <button
                                type="button"
                                onClick={() => onFocusSlot(slot.id)}
                                title={`Replace ${player.name}`}
                                className="min-w-0 flex-1 truncate text-left text-sm font-medium"
                            >
                                {player.name}
                            </button>
                            <span className="font-anton text-sm text-primary">
                                {player.proj === null ? '—' : player.proj.toFixed(1)}
                            </span>
                            {!isPreview && (
                                <button
                                    type="button"
                                    onClick={() => onRemove(slot.id)}
                                    title="Remove"
                                    className="flex size-5 items-center justify-center rounded-full bg-foreground text-background hover:bg-primary"
                                >
                                    <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
                                </button>
                            )}
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={() => onFocusSlot(slot.id)}
                            className="flex flex-1 items-center gap-1.5 text-left text-sm text-muted-foreground hover:text-foreground"
                        >
                            <HugeiconsIcon icon={PlusSignIcon} className="size-4" />
                            Pick a player
                        </button>
                    )}
                </li>
            )
        })}
    </ul>
)
