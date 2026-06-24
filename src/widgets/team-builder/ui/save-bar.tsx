'use client'

import {
    Edit02Icon,
    Eraser01Icon,
    MagicWand01Icon,
    Tick02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { cn } from '@/shared/utils'

interface SaveBarProps {
    teamName: string
    onTeamNameChange: (name: string) => void
    canSave: boolean
    isSaving: boolean
    isAutofilling?: boolean
    // Autofill is only allowed once a league is chosen — the AI draws from that
    // league's teams. Defaults to true so non-builder usages are unaffected.
    canAutofill?: boolean
    onSave: () => void
    onAutofill?: () => void
    onClear?: () => void
    editMode?: boolean
    weekLabel?: string
}

export const SaveBar = ({
    teamName,
    onTeamNameChange,
    canSave,
    isSaving,
    isAutofilling = false,
    canAutofill = true,
    onSave,
    onAutofill,
    onClear,
    editMode = false,
    weekLabel,
}: SaveBarProps) => {
    const saveDisabled = !canSave || isSaving
    const autofillDisabled = isSaving || isAutofilling || !canAutofill

    const idleLabel = editMode
        ? weekLabel
            ? `Save lineup for ${weekLabel}`
            : 'Save lineup'
        : 'Save team'

    return (
        <div className="sticky top-16 z-20 border-b border-foreground/10 bg-background/90 backdrop-blur">
            <div className="container mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-3 px-6 py-3">
                <label className="group flex items-center gap-1.5 rounded-md border border-dashed border-foreground/20 bg-card/40 px-2 py-1 transition-colors focus-within:border-primary/60 focus-within:bg-card hover:border-foreground/40">
                    <HugeiconsIcon
                        icon={Edit02Icon}
                        className="size-3.5 text-muted-foreground transition-colors group-focus-within:text-primary"
                    />
                    <input
                        value={teamName}
                        onChange={(e) => onTeamNameChange(e.target.value)}
                        maxLength={60}
                        aria-label="Team name"
                        placeholder="Team name"
                        className="w-56 bg-transparent font-anton text-xl tracking-wide outline-none"
                    />
                </label>

                <div className="ml-auto flex items-center gap-2">
                    {onAutofill && (
                        <button
                            type="button"
                            onClick={onAutofill}
                            disabled={autofillDisabled}
                            title={
                                canAutofill
                                    ? 'AI fills remaining slots from your selected league (3 credits)'
                                    : 'Select a league first'
                            }
                            className={cn(
                                'flex items-center gap-1.5 rounded-md border border-foreground/15 px-3 py-2 text-sm transition-colors hover:bg-muted',
                                autofillDisabled && 'cursor-not-allowed opacity-40',
                            )}
                        >
                            <HugeiconsIcon
                                icon={MagicWand01Icon}
                                className={cn('size-4', isAutofilling && 'animate-pulse')}
                            />
                            {isAutofilling ? 'Asking AI…' : 'Autofill ✨'}
                        </button>
                    )}
                    {onClear && (
                        <button
                            type="button"
                            onClick={onClear}
                            disabled={isSaving}
                            className={cn(
                                'flex items-center gap-1.5 rounded-md border border-foreground/15 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                                isSaving && 'cursor-not-allowed opacity-40',
                            )}
                        >
                            <HugeiconsIcon icon={Eraser01Icon} className="size-4" />
                            Clear
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={saveDisabled}
                        className={cn(
                            'flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:brightness-95',
                            saveDisabled && 'cursor-not-allowed opacity-40',
                        )}
                    >
                        <HugeiconsIcon icon={Tick02Icon} className="size-4" />
                        {isSaving ? 'Saving…' : idleLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}
