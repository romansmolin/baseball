'use client'

import { useState } from 'react'

import type { PoolPlayer } from '@/shared/team-builder'
import { cn } from '@/shared/utils'

import type { PlayerPlacement } from '../model/team-builder-roster'

interface PlayerPoolRowProps {
    player: PoolPlayer
    placement: PlayerPlacement
    onAdd: () => void
}

const initials = (name: string) =>
    name
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()

const money = (n: number) => `$${(n / 1000).toFixed(1)}k`

const hexA = (hex: string, a: number) => {
    const n = parseInt(hex.slice(1), 16)
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

interface PlayerAvatarProps {
    name: string
    photoUrl: string | null
    leagueColor: string
    size: number
    fontClass?: string
}

const PlayerAvatar = ({ name, photoUrl, leagueColor, size, fontClass }: PlayerAvatarProps) => {
    const [failed, setFailed] = useState(false)
    const showImage = photoUrl && !failed
    return (
        <span
            className="flex shrink-0 items-center justify-center overflow-hidden rounded-full font-anton text-xs"
            style={{
                width: size,
                height: size,
                backgroundColor: hexA(leagueColor, 0.14),
                color: leagueColor,
            }}
        >
            {showImage ? (
                <img
                    src={photoUrl}
                    alt=""
                    width={size}
                    height={size}
                    onError={() => setFailed(true)}
                    className="size-full object-cover"
                />
            ) : (
                <span className={fontClass}>{initials(name)}</span>
            )}
        </span>
    )
}

export { PlayerAvatar }

export const PlayerPoolRow = ({
    player,
    placement,
    onAdd,
}: PlayerPoolRowProps) => {
    let label = 'Add'
    let disabled = false
    if (!placement.allowed && placement.reason === 'duplicate') {
        label = 'In lineup'
        disabled = true
    } else if (!placement.allowed && placement.reason === 'no-slot') {
        label = 'No slot'
        disabled = true
    } else if (!placement.allowed && placement.reason === 'over-budget') {
        label = 'Over cap'
        disabled = true
    } else if (placement.allowed && placement.replacedPlayerId !== null) {
        label = 'Replace'
    }

    const canAdd = !disabled

    return (
        <div
            className={cn(
                'flex items-center gap-3 rounded-xl border px-3 py-2 transition-colors',
                !placement.allowed && placement.reason === 'duplicate'
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-foreground/10 bg-card',
            )}
        >
            <PlayerAvatar
                name={player.name}
                photoUrl={player.photoUrl}
                leagueColor={player.leagueColor}
                size={36}
            />
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium">{player.name}</span>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {player.pos}
                    </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{player.team}</span>
                    <span className="opacity-40">·</span>
                    <span className="font-mono">{money(player.salary)}</span>
                </div>
            </div>
            <div className="text-right">
                <div className="font-anton text-base leading-none text-primary">
                    {player.proj.toFixed(1)}
                </div>
                <div className="text-[10px] text-muted-foreground">proj</div>
            </div>
            <button
                type="button"
                onClick={onAdd}
                disabled={disabled}
                className={cn(
                    'shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                    canAdd
                        ? 'bg-primary text-primary-foreground hover:brightness-95'
                        : 'cursor-not-allowed bg-muted text-muted-foreground',
                )}
            >
                {label}
            </button>
        </div>
    )
}
