'use client'

import {
    Cancel01Icon,
    MagicWand01Icon,
    Tick02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Dialog } from '@base-ui/react/dialog'
import { useEffect, useMemo, useState } from 'react'

import type { BuilderTeam } from '@/shared/team-builder'
import { cn } from '@/shared/utils'

interface AutofillModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    teams: BuilderTeam[]
    teamsLoading: boolean
    teamsError: Error | undefined
    // Pre-checked when the modal opens.
    initialSelectedTeamIds: number[]
    onConfirm: (mlbTeamIds: number[]) => void
    isAutofilling: boolean
}

const UNGROUPED = 'Other'

export const AutofillModal = ({
    open,
    onOpenChange,
    teams,
    teamsLoading,
    teamsError,
    initialSelectedTeamIds,
    onConfirm,
    isAutofilling,
}: AutofillModalProps) => {
    const [selectedIds, setSelectedIds] = useState<Set<number>>(
        () => new Set(initialSelectedTeamIds),
    )

    // Re-seed the selection every time the modal opens so the current
    // team-builder dropdown choice is reflected as a default pick.
    useEffect(() => {
        if (open) setSelectedIds(new Set(initialSelectedTeamIds))
    }, [open, initialSelectedTeamIds])

    const groupedTeams = useMemo(() => groupTeamsByLeague(teams), [teams])

    const toggle = (id: number) =>
        setSelectedIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })

    const selectAll = () => setSelectedIds(new Set(teams.map((t) => t.id)))
    const clearAll = () => setSelectedIds(new Set())

    const canConfirm = selectedIds.size > 0 && !isAutofilling

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
                <Dialog.Popup
                    className={cn(
                        'fixed top-1/2 left-1/2 z-50 flex w-[min(36rem,calc(100vw-2rem))] max-h-[85vh] -translate-x-1/2 -translate-y-1/2 flex-col',
                        'rounded-2xl border border-foreground/10 bg-card shadow-2xl outline-none transition-all',
                        'data-[ending-style]:scale-95 data-[ending-style]:opacity-0',
                        'data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
                    )}
                >
                    <Header onClose={() => onOpenChange(false)} />

                    <Toolbar
                        selectedCount={selectedIds.size}
                        totalCount={teams.length}
                        onSelectAll={selectAll}
                        onClearAll={clearAll}
                        disabled={teamsLoading || !!teamsError}
                    />

                    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
                        {teamsLoading && <LoadingState />}
                        {teamsError && <ErrorState />}
                        {!teamsLoading && !teamsError && teams.length === 0 && (
                            <EmptyState />
                        )}
                        {!teamsLoading && !teamsError && teams.length > 0 && (
                            <div className="space-y-4">
                                {groupedTeams.map(({ league, items }) => (
                                    <TeamGroup
                                        key={league}
                                        league={league}
                                        teams={items}
                                        selectedIds={selectedIds}
                                        onToggle={toggle}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    <Footer
                        canConfirm={canConfirm}
                        selectedCount={selectedIds.size}
                        isAutofilling={isAutofilling}
                        onCancel={() => onOpenChange(false)}
                        onConfirm={() => onConfirm([...selectedIds])}
                    />
                </Dialog.Popup>
            </Dialog.Portal>
        </Dialog.Root>
    )
}

const Header = ({ onClose }: { onClose: () => void }) => (
    <div className="flex items-start justify-between gap-3 border-b border-foreground/10 px-5 py-4">
        <div className="min-w-0">
            <Dialog.Title className="flex items-center gap-2 font-medium">
                <HugeiconsIcon icon={MagicWand01Icon} className="size-4 text-primary" />
                Autofill from teams
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-xs text-muted-foreground">
                Pick the MLB teams the AI should draw from. Costs 3 credits per
                run.
            </Dialog.Description>
        </div>
        <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
            <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
        </button>
    </div>
)

const Toolbar = ({
    selectedCount,
    totalCount,
    onSelectAll,
    onClearAll,
    disabled,
}: {
    selectedCount: number
    totalCount: number
    onSelectAll: () => void
    onClearAll: () => void
    disabled: boolean
}) => (
    <div className="flex items-center justify-between border-b border-foreground/10 px-5 py-2 text-xs">
        <span className="text-muted-foreground">
            <span className="font-medium text-foreground">{selectedCount}</span>{' '}
            of {totalCount} selected
        </span>
        <div className="flex items-center gap-3">
            <button
                type="button"
                onClick={onSelectAll}
                disabled={disabled || selectedCount === totalCount}
                className="text-primary transition-colors hover:underline disabled:cursor-not-allowed disabled:opacity-40"
            >
                Select all
            </button>
            <button
                type="button"
                onClick={onClearAll}
                disabled={disabled || selectedCount === 0}
                className="text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
                Clear
            </button>
        </div>
    </div>
)

const TeamGroup = ({
    league,
    teams,
    selectedIds,
    onToggle,
}: {
    league: string
    teams: BuilderTeam[]
    selectedIds: Set<number>
    onToggle: (id: number) => void
}) => (
    <div>
        <div className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {league}
        </div>
        <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {teams.map((team) => {
                const checked = selectedIds.has(team.id)
                return (
                    <li key={team.id}>
                        <button
                            type="button"
                            onClick={() => onToggle(team.id)}
                            className={cn(
                                'flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-sm transition-colors',
                                checked
                                    ? 'border-primary/60 bg-primary/10'
                                    : 'border-foreground/10 hover:border-foreground/30 hover:bg-muted',
                            )}
                        >
                            <span
                                className={cn(
                                    'flex size-4 shrink-0 items-center justify-center rounded border',
                                    checked
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : 'border-foreground/30 bg-transparent',
                                )}
                            >
                                {checked && (
                                    <HugeiconsIcon
                                        icon={Tick02Icon}
                                        className="size-3"
                                    />
                                )}
                            </span>
                            <span className="font-mono text-xs text-muted-foreground">
                                {team.abbreviation}
                            </span>
                            <span className="truncate">{team.name}</span>
                        </button>
                    </li>
                )
            })}
        </ul>
    </div>
)

const Footer = ({
    canConfirm,
    selectedCount,
    isAutofilling,
    onCancel,
    onConfirm,
}: {
    canConfirm: boolean
    selectedCount: number
    isAutofilling: boolean
    onCancel: () => void
    onConfirm: () => void
}) => (
    <div className="flex items-center justify-end gap-2 border-t border-foreground/10 px-5 py-3">
        <button
            type="button"
            onClick={onCancel}
            disabled={isAutofilling}
            className="rounded-md border border-foreground/15 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
            Cancel
        </button>
        <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            className={cn(
                'flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-all hover:brightness-95',
                !canConfirm && 'cursor-not-allowed opacity-40',
            )}
        >
            <HugeiconsIcon
                icon={MagicWand01Icon}
                className={cn('size-4', isAutofilling && 'animate-pulse')}
            />
            {isAutofilling
                ? 'Asking AI…'
                : selectedCount === 0
                  ? 'Pick at least 1 team'
                  : `Autofill from ${selectedCount} team${selectedCount === 1 ? '' : 's'}`}
        </button>
    </div>
)

const LoadingState = () => (
    <div className="space-y-2 py-6">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-2 gap-1">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-8 animate-pulse rounded bg-muted/60" />
            ))}
        </div>
    </div>
)

const ErrorState = () => (
    <div className="py-8 text-center text-sm text-muted-foreground">
        Couldn’t load teams. Close this and try again.
    </div>
)

const EmptyState = () => (
    <div className="py-8 text-center text-sm text-muted-foreground">
        No teams available.
    </div>
)

interface LeagueGroup {
    league: string
    items: BuilderTeam[]
}

function groupTeamsByLeague(teams: BuilderTeam[]): LeagueGroup[] {
    const byLeague = new Map<string, BuilderTeam[]>()
    for (const team of teams) {
        const key = team.league ?? UNGROUPED
        const list = byLeague.get(key)
        if (list) list.push(team)
        else byLeague.set(key, [team])
    }
    // Stable alpha order, but push "Other" to the end.
    const entries = [...byLeague.entries()]
    entries.sort(([a], [b]) => {
        if (a === UNGROUPED) return 1
        if (b === UNGROUPED) return -1
        return a.localeCompare(b)
    })
    return entries.map(([league, items]) => ({
        league,
        items: [...items].sort((a, b) => a.name.localeCompare(b.name)),
    }))
}
