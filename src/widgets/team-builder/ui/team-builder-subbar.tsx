'use client'

import {
    ArrowLeft01Icon,
    Eraser01Icon,
    MagicWand01Icon,
    Tick02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Link from 'next/link'

import { cn } from '@/shared/utils'

interface TeamBuilderSubbarProps {
    teamName: string
    onTeamNameChange: (name: string) => void
    onAutofill: () => void
    onClear: () => void
    onSave: () => void
    canSave: boolean
}

export const TeamBuilderSubbar = ({
    teamName,
    onTeamNameChange,
    onAutofill,
    onClear,
    onSave,
    canSave,
}: TeamBuilderSubbarProps) => (
    <div className="sticky top-16 z-20 border-b border-foreground/10 bg-background/90 backdrop-blur">
        <div className="container mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-3 px-6 py-3">
            <Link
                href="/teams"
                className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
                <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
                My teams
            </Link>
            <div className="h-5 w-px bg-foreground/10" />
            <div className="flex items-center gap-2">
                <input
                    value={teamName}
                    onChange={(e) => onTeamNameChange(e.target.value)}
                    aria-label="Team name"
                    className="w-44 rounded-md border border-transparent bg-transparent px-1.5 py-1 font-anton text-xl tracking-wide outline-none transition-colors hover:border-foreground/15 focus:border-primary/40 focus:bg-card"
                />
                <span className="rounded-full border border-foreground/15 px-2 py-0.5 text-xs text-muted-foreground">
                    MLB
                </span>
                <span className="rounded-full border border-foreground/15 px-2 py-0.5 text-xs text-muted-foreground">
                    Daily
                </span>
            </div>

            <div className="ml-auto flex items-center gap-2">
                <button
                    type="button"
                    onClick={onAutofill}
                    className="flex items-center gap-1.5 rounded-md border border-foreground/15 px-3 py-2 text-sm transition-colors hover:bg-muted"
                >
                    <HugeiconsIcon icon={MagicWand01Icon} className="size-4" />
                    Autofill
                </button>
                <button
                    type="button"
                    onClick={onClear}
                    className="flex items-center gap-1.5 rounded-md border border-foreground/15 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                    <HugeiconsIcon icon={Eraser01Icon} className="size-4" />
                    Clear
                </button>
                <button
                    type="button"
                    onClick={onSave}
                    disabled={!canSave}
                    className={cn(
                        'flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:brightness-95',
                        !canSave && 'cursor-not-allowed opacity-40',
                    )}
                >
                    <HugeiconsIcon icon={Tick02Icon} className="size-4" />
                    Save lineup
                </button>
            </div>
        </div>
    </div>
)
