'use client'

import { Alert02Icon, RefreshIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

interface TeamsErrorStateProps {
    onRetry: () => void
    message?: string
}

export const TeamsErrorState = ({ onRetry, message }: TeamsErrorStateProps) => (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-destructive/30 bg-destructive/5 py-20 text-center">
        <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            <HugeiconsIcon icon={Alert02Icon} className="size-6" />
        </span>
        <div className="font-medium">Couldn&apos;t load your teams</div>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            {message ?? 'Something went wrong on our side. Try again in a moment.'}
        </p>
        <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex items-center gap-2 rounded-md border border-foreground/15 px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
            <HugeiconsIcon icon={RefreshIcon} className="size-4" />
            Retry
        </button>
    </div>
)
