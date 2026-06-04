'use client'

import { Cancel01Icon, PlusSignIcon, StarIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { cn } from '@/shared/utils'

import { CAPTAIN_MULTIPLIER } from '../model/team-builder.type'
import type { FieldSlot as FieldSlotType, PoolPlayer } from '../model/team-builder.type'

import { PlayerAvatar } from './player-pool-row'

interface FieldSlotProps {
    slot: FieldSlotType
    player: PoolPlayer | null
    isCaptain: boolean
    onFocusEmpty: () => void
    onRemove: () => void
    onToggleCaptain: () => void
}

const initials = (name: string) =>
    name
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()

const hexA = (hex: string, a: number) => {
    const n = parseInt(hex.slice(1), 16)
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

export const FieldSlot = ({
    slot,
    player,
    isCaptain,
    onFocusEmpty,
    onRemove,
    onToggleCaptain,
}: FieldSlotProps) => {
    const positionStyle = {
        left: `${slot.x}%`,
        top: `${slot.y}%`,
    }

    if (player === null) {
        return (
            <button
                type="button"
                onClick={onFocusEmpty}
                className="group absolute -translate-x-1/2 -translate-y-1/2 transition-transform duration-150 hover:scale-105"
                style={positionStyle}
            >
                <span className="flex size-14 flex-col items-center justify-center rounded-full border-2 border-dashed border-white/80 bg-black/15 text-white backdrop-blur-sm transition-colors group-hover:bg-black/30">
                    <HugeiconsIcon icon={PlusSignIcon} className="size-4" />
                    <span className="mt-0.5 text-[10px] font-semibold tracking-wide">
                        {slot.label}
                    </span>
                </span>
            </button>
        )
    }

    const displayPts = player.proj * (isCaptain ? CAPTAIN_MULTIPLIER : 1)

    return (
        <div
            className="absolute -translate-x-1/2 -translate-y-1/2 transition-transform duration-150 hover:scale-105"
            style={positionStyle}
        >
            <div
                className={cn(
                    'relative flex w-[96px] flex-col items-center rounded-xl border bg-card/95 px-1.5 py-1.5 shadow-md backdrop-blur',
                    isCaptain ? 'border-primary' : 'border-white/70',
                )}
            >
                <button
                    type="button"
                    onClick={onRemove}
                    title="Remove"
                    className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-foreground text-background shadow transition-colors hover:bg-primary"
                >
                    <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
                </button>
                <button
                    type="button"
                    onClick={onToggleCaptain}
                    title="Captain ×1.5"
                    aria-pressed={isCaptain}
                    className={cn(
                        'absolute -top-1.5 -left-1.5 flex size-5 items-center justify-center rounded-full shadow transition-colors hover:text-primary',
                        isCaptain
                            ? 'bg-primary text-primary-foreground'
                            : 'border border-foreground/15 bg-card text-muted-foreground',
                    )}
                >
                    <HugeiconsIcon
                        icon={StarIcon}
                        className="size-3"
                        fill={isCaptain ? 'currentColor' : 'none'}
                    />
                </button>
                <PlayerAvatar
                    name={player.name}
                    photoUrl={player.photoUrl}
                    leagueColor={player.leagueColor}
                    size={32}
                />
                <span className="mt-1 line-clamp-1 max-w-full text-center text-[11px] leading-tight font-medium">
                    {player.name}
                </span>
                <span className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className="rounded bg-muted px-1 font-semibold">{slot.label}</span>
                    <span className="font-anton text-primary">{displayPts.toFixed(1)}</span>
                </span>
            </div>
        </div>
    )
}
