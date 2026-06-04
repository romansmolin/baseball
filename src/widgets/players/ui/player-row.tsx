'use client'

import { ArrowRight01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { cn } from '@/shared/utils'

import { AVAILABILITY } from '../model/player.type'
import type { League, Player } from '../model/player.type'
import { FormSparkline } from './form-sparkline'

interface PlayerRowProps {
    player: Player
    league: League | undefined
    onSelect: () => void
}

const initials = (name: string) =>
    name
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()

const formatSalary = (n: number) => `$${(n / 1000).toFixed(1)}k`

const hexA = (hex: string, a: number) => {
    const n = parseInt(hex.slice(1), 16)
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

export const PlayerRow = ({ player, league, onSelect }: PlayerRowProps) => {
    const color = league?.color ?? '#999999'
    const leagueName = league?.name ?? player.leagueSlug.toUpperCase()
    const availability = AVAILABILITY[player.status]

    const handleKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onSelect()
        }
    }

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onSelect}
            onKeyDown={handleKey}
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-foreground/10 bg-card px-3 py-2.5 transition-all hover:border-foreground/20 hover:shadow-sm"
        >
            <span
                className="relative flex size-10 shrink-0 items-center justify-center rounded-full font-anton text-sm"
                style={{ backgroundColor: hexA(color, 0.14), color }}
            >
                {initials(player.name)}
                <span
                    className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-card"
                    style={{ backgroundColor: availability.dot }}
                    title={availability.label}
                />
            </span>

            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{player.name}</span>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {player.pos}
                    </span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>{player.team}</span>
                    <span className="opacity-40">·</span>
                    <span>{leagueName}</span>
                    <span
                        className={cn(
                            'ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                            availability.bgClass,
                            availability.textClass,
                        )}
                    >
                        {availability.label}
                    </span>
                </div>
            </div>

            <span className="hidden w-24 justify-center sm:flex">
                <FormSparkline form={player.form} color={color} />
            </span>
            <span className="hidden w-16 text-right font-mono text-xs text-muted-foreground md:block">
                {formatSalary(player.salary)}
            </span>
            <span className="hidden w-14 text-right font-mono text-xs text-muted-foreground md:block">
                {player.own}%
            </span>
            <span className="w-16 text-right">
                <span className="font-anton text-lg text-primary">{player.proj.toFixed(1)}</span>
            </span>
            <HugeiconsIcon
                icon={ArrowRight01Icon}
                className="size-4 shrink-0 text-muted-foreground/50"
            />
        </div>
    )
}
