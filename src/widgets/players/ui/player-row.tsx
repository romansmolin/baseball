'use client'

import { cn } from '@/shared/utils'

import { AVAILABILITY } from '../model/player.type'
import type { League, Player } from '../model/player.type'
import { getPlayerStatSummary } from '../model/player-display'
import { PlayerAvatar } from './player-avatar'

interface PlayerRowProps {
    player: Player
    league: League | undefined
    onSelect: () => void
}

export const PlayerRow = ({ player, league, onSelect }: PlayerRowProps) => {
    const color = league?.color ?? '#999999'
    const availability = AVAILABILITY[player.status]
    const stats = getPlayerStatSummary({
        position: player.pos,
        battingStats: player.battingStats,
        pitchingStats: player.pitchingStats,
    })

    return (
        <button
            type="button"
            onClick={onSelect}
            className="flex w-full items-center gap-3 rounded-xl border border-foreground/10 bg-card px-3 py-2.5 text-left transition-all hover:border-foreground/20 hover:shadow-sm"
        >
            <span className="relative">
                <PlayerAvatar
                    name={player.name}
                    photoUrl={player.photoUrl}
                    color={color}
                    className="size-10 rounded-full text-sm"
                />
                <span
                    className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-card"
                    style={{ backgroundColor: availability.dot }}
                    title={availability.label}
                />
            </span>

            <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{player.name}</span>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {player.pos}
                    </span>
                </span>
                <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    {player.team}
                    <span aria-hidden="true" className="opacity-40">·</span>
                    {league?.name ?? player.leagueSlug.toUpperCase()}
                    <span
                        className={cn(
                            'ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                            availability.bgClass,
                            availability.textClass,
                        )}
                    >
                        {availability.label}
                    </span>
                </span>
            </span>

            <span className="flex shrink-0 items-center gap-2 sm:gap-4">
                {stats.map(([label, value]) => (
                    <span key={label} className="min-w-9 text-right">
                        <span className="block text-[10px] text-muted-foreground">{label}</span>
                        <span className="font-mono text-xs font-semibold tabular-nums">{value}</span>
                    </span>
                ))}
            </span>
        </button>
    )
}
