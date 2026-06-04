'use client'

import { SearchRemoveIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

interface PlayersEmptyStateProps {
    onClearFilters: () => void
}

export const PlayersEmptyState = ({ onClearFilters }: PlayersEmptyStateProps) => (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-foreground/15 py-20 text-center">
        <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <HugeiconsIcon icon={SearchRemoveIcon} className="size-6" />
        </span>
        <div className="font-medium">No players match your filters</div>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Try a different position, league or status, or clear your filters.
        </p>
        <button
            type="button"
            onClick={onClearFilters}
            className="mt-4 rounded-md border border-foreground/15 px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
            Clear filters
        </button>
    </div>
)
