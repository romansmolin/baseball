'use client'

import { cn } from '@/shared/utils'

import type { PositionFilter } from '../model/player.type'

const POSITION_OPTIONS: { value: PositionFilter; label: string }[] = [
    { value: 'all', label: 'All positions' },
    { value: 'P', label: 'Pitchers' },
    { value: 'IF', label: 'Infield' },
    { value: 'OF', label: 'Outfield' },
    { value: 'C', label: 'Catcher' },
]

interface PlayersToolbarProps {
    position: PositionFilter
    onPositionChange: (position: PositionFilter) => void
}

export const PlayersToolbar = ({ position, onPositionChange }: PlayersToolbarProps) => (
    <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {POSITION_OPTIONS.map((option) => {
            const isActive = option.value === position
            return (
                <button
                    key={option.value}
                    type="button"
                    onClick={() => onPositionChange(option.value)}
                    className={cn(
                        'rounded-full px-3 py-1.5 text-sm transition-colors',
                        isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'border border-foreground/15 text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                >
                    {option.label}
                </button>
            )
        })}
    </div>
)
