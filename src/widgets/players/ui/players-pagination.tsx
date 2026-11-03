'use client'

import { Button } from '@/shared/ui/button'

import { getPlayersPageRange, PLAYERS_PER_PAGE } from '../model/player-query-state'

export interface PlayersPaginationProps {
    offset: number
    total: number
    onChange: (offset: number) => void
}

export const PlayersPagination = ({ offset, total, onChange }: PlayersPaginationProps) => (
    <nav aria-label="Players pages" className="flex flex-wrap items-center justify-between gap-3 pt-4">
        <span aria-live="polite" className="text-xs text-muted-foreground">
            {getPlayersPageRange(offset, total)}
        </span>
        <div className="flex gap-2">
            <Button
                variant="outline"
                size="sm"
                disabled={offset === 0}
                onClick={() => onChange(Math.max(0, offset - PLAYERS_PER_PAGE))}
            >
                Previous
            </Button>
            <Button
                variant="outline"
                size="sm"
                disabled={offset + PLAYERS_PER_PAGE >= total}
                onClick={() => onChange(offset + PLAYERS_PER_PAGE)}
            >
                Next
            </Button>
        </div>
    </nav>
)
