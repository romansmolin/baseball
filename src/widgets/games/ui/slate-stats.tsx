import { Calendar01Icon, ChartLineData01Icon, Target01Icon, UserCheck01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { cn } from '@/shared/utils'

import type { SlateStats } from '../model/games-board'

interface TileProps {
    label: string
    value: string
    note: string
    icon: typeof Calendar01Icon
    tone: string
}

const Tile = ({ label, value, note, icon, tone }: TileProps) => (
    <div className="rounded-2xl border border-foreground/10 bg-card p-5">
        <div className="flex items-start justify-between gap-3">
            <span className="text-sm font-medium text-muted-foreground">{label}</span>
            <span className={cn('flex size-10 items-center justify-center rounded-xl', tone)}>
                <HugeiconsIcon icon={icon} className="size-5" />
            </span>
        </div>
        <div className="mt-2 text-4xl leading-none font-bold tracking-tight tabular-nums">{value}</div>
        <p className="mt-3 text-xs text-muted-foreground">{note}</p>
    </div>
)

export const SlateStatsRow = ({ stats, dayLabel }: { stats: SlateStats; dayLabel: string }) => (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile
            label="Games on this slate"
            value={String(stats.games).padStart(2, '0')}
            note={dayLabel}
            icon={Calendar01Icon}
            tone="bg-[#dcefe2] text-[#1f6b3f]"
        />
        <Tile
            label="Strongest favourite"
            value={stats.strongest ? `${Math.round(stats.strongest.probability * 100)}%` : '—'}
            note={
                stats.strongest
                    ? `${stats.strongest.abbreviation} over ${stats.strongestOpponent}, chance to win`
                    : 'No estimate yet'
            }
            icon={ChartLineData01Icon}
            tone="bg-[#ffe6e0] text-[#d6513a]"
        />
        <Tile
            label="Toss-ups"
            value={String(stats.tossUps).padStart(2, '0')}
            note="Games the model cannot separate"
            icon={Target01Icon}
            tone="bg-[#e1e9f7] text-[#3b5fa8]"
        />
        <Tile
            label="Starters named"
            value={`${stats.startersNamed}/${stats.games}`}
            note="Games with both probable pitchers"
            icon={UserCheck01Icon}
            tone="bg-[#dcefe2] text-[#1f6b3f]"
        />
    </div>
)
