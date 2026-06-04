'use client'

import {
    ArrowDown01Icon,
    ArrowRight01Icon,
    Cancel01Icon,
    Clock01Icon,
    Copy01Icon,
    Delete02Icon,
    Edit02Icon,
    GameController01Icon,
    Note01Icon,
    StarIcon,
    Tick02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useSWRConfig } from 'swr'

import { renameMyTeam } from '@/entities/my-teams'
import { ApiError } from '@/shared/api/api-error'
import { cn } from '@/shared/utils'

import type { League, Team, TeamRosterSlot } from '../model/team.type'

interface TeamDetailDrawerProps {
    team: Team | null
    league: League | undefined
    isFav: boolean
    onClose: () => void
    onToggleFav: () => void
}

const initials = (name: string) =>
    name
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()

const savedLabel = (d: number) => (d === 0 ? 'today' : d === 1 ? 'yesterday' : `${d}d ago`)

const hexA = (hex: string, a: number) => {
    const n = parseInt(hex.slice(1), 16)
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

const money = (n: number) => `$${(n / 1000).toFixed(1)}k`

export const TeamDetailDrawer = ({ team, league, isFav, onClose, onToggleFav }: TeamDetailDrawerProps) => {
    const isOpen = team !== null
    const { mutate } = useSWRConfig()

    const [isEditingName, setIsEditingName] = useState(false)
    const [editedName, setEditedName] = useState('')
    const [isSavingName, setIsSavingName] = useState(false)
    const [nameError, setNameError] = useState<string | null>(null)
    const [isLineupOpen, setIsLineupOpen] = useState(false)
    const nameInputRef = useRef<HTMLInputElement | null>(null)

    useEffect(() => {
        // Reset edit + lineup state whenever the selected team changes or drawer closes.
        setIsEditingName(false)
        setEditedName(team?.name ?? '')
        setIsSavingName(false)
        setNameError(null)
        setIsLineupOpen(false)
    }, [team?.id, team?.name])

    useEffect(() => {
        if (isEditingName) nameInputRef.current?.focus()
    }, [isEditingName])

    useEffect(() => {
        if (!isOpen) return
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (isEditingName) {
                    setIsEditingName(false)
                    setEditedName(team?.name ?? '')
                    setNameError(null)
                } else {
                    onClose()
                }
            }
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [isOpen, isEditingName, onClose, team?.name])

    const dotColor = league?.dotColor ?? '#999999'
    const leagueName = league?.name ?? team?.leagueSlug.toUpperCase() ?? ''
    const avg = team ? team.proj * 0.92 : 0

    const startEditing = () => {
        if (!team) return
        setEditedName(team.name)
        setNameError(null)
        setIsEditingName(true)
    }

    const cancelEditing = () => {
        setIsEditingName(false)
        setEditedName(team?.name ?? '')
        setNameError(null)
    }

    const saveName = async () => {
        if (!team) return
        const trimmed = editedName.trim()
        if (trimmed.length === 0) {
            setNameError('Name cannot be empty')
            return
        }
        if (trimmed === team.name) {
            setIsEditingName(false)
            return
        }
        setIsSavingName(true)
        setNameError(null)
        try {
            await renameMyTeam(team.id, trimmed)
            await mutate(['me', 'teams'])
            setIsEditingName(false)
        } catch (err) {
            const apiErr = err instanceof ApiError ? err : null
            setNameError(apiErr?.message ?? 'Could not save name')
        } finally {
            setIsSavingName(false)
        }
    }

    return (
        <>
            <button
                type="button"
                aria-label="Close detail panel"
                onClick={onClose}
                className={cn(
                    'fixed inset-0 z-40 bg-foreground/30 transition-opacity duration-200',
                    isOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
                )}
            />
            <aside
                role="dialog"
                aria-hidden={!isOpen}
                className={cn(
                    'fixed top-0 right-0 z-50 flex h-svh w-full max-w-md flex-col border-l border-foreground/10 bg-card shadow-2xl transition-transform duration-300 ease-out',
                    isOpen ? 'translate-x-0' : 'translate-x-full',
                )}
            >
                {team && (
                    <>
                        <div className="flex items-center justify-between border-b border-foreground/10 px-6 py-4">
                            <div className="text-xs text-muted-foreground">
                                {leagueName} · {team.format}
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                                <HugeiconsIcon icon={Cancel01Icon} className="size-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-5">
                            <div className="flex items-center gap-4">
                                <span
                                    className="flex size-16 shrink-0 items-center justify-center rounded-2xl font-anton text-2xl"
                                    style={{ backgroundColor: hexA(dotColor, 0.13), color: dotColor }}
                                >
                                    {initials(team.name)}
                                </span>
                                <div className="min-w-0 flex-1">
                                    {isEditingName ? (
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1.5">
                                                <input
                                                    ref={nameInputRef}
                                                    value={editedName}
                                                    onChange={(e) => setEditedName(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') void saveName()
                                                    }}
                                                    maxLength={60}
                                                    aria-label="Team name"
                                                    placeholder="Team name"
                                                    disabled={isSavingName}
                                                    className="min-w-0 flex-1 rounded-md border border-primary/40 bg-card px-2 py-1 font-anton text-2xl tracking-wide outline-none focus:border-primary disabled:opacity-50"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => void saveName()}
                                                    disabled={isSavingName}
                                                    title="Save"
                                                    className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground transition-colors hover:brightness-95 disabled:opacity-50"
                                                >
                                                    <HugeiconsIcon icon={Tick02Icon} className="size-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={cancelEditing}
                                                    disabled={isSavingName}
                                                    title="Cancel"
                                                    className="flex size-8 items-center justify-center rounded-md border border-foreground/15 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                                                >
                                                    <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
                                                </button>
                                            </div>
                                            {nameError && (
                                                <span className="text-xs text-red-500">
                                                    {nameError}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={startEditing}
                                            className="group flex w-full min-w-0 items-center gap-1.5 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-muted/40"
                                            title="Rename team"
                                        >
                                            <span className="truncate font-anton text-2xl tracking-wide">
                                                {team.name}
                                            </span>
                                            <HugeiconsIcon
                                                icon={Edit02Icon}
                                                className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                                            />
                                        </button>
                                    )}
                                    <div className="mt-1 flex flex-wrap items-center gap-1.5 px-1">
                                        <span className="flex items-center gap-1.5 rounded-full border border-foreground/15 px-2 py-0.5 text-xs text-muted-foreground">
                                            <span
                                                className="size-2 rounded-full"
                                                style={{ backgroundColor: dotColor }}
                                            />
                                            {leagueName}
                                        </span>
                                        <span className="rounded-full border border-foreground/15 px-2 py-0.5 text-xs text-muted-foreground">
                                            {team.format}
                                        </span>
                                        {team.captain && (
                                            <span className="rounded-full border border-primary/30 px-2 py-0.5 text-xs text-primary">
                                                Captain ×1.5
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 grid grid-cols-2 gap-3">
                                <BigStat label="Projected points" value={team.proj.toFixed(1)} accent />
                                <BigStat label="Best score" value={team.best.toFixed(1)} />
                            </div>

                            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                                <SmallStat label="Players" value={String(team.players)} />
                                <SmallStat label="Avg score" value={avg.toFixed(1)} />
                                <SmallStat label="Entries" value={String(team.entered)} />
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsLineupOpen((open) => !open)}
                                className="mt-5 flex w-full items-center justify-between rounded-xl border border-foreground/10 px-4 py-3 transition-colors hover:bg-muted/40"
                                aria-expanded={isLineupOpen}
                            >
                                <div className="flex items-center gap-2.5 text-sm">
                                    <HugeiconsIcon
                                        icon={Note01Icon}
                                        className="size-4 text-muted-foreground"
                                    />
                                    <span>Lineup &amp; roster</span>
                                </div>
                                <span className="flex items-center gap-1 text-sm font-medium text-primary">
                                    {isLineupOpen ? 'Hide' : 'Open lineup'}
                                    <HugeiconsIcon
                                        icon={isLineupOpen ? ArrowDown01Icon : ArrowRight01Icon}
                                        className="size-3.5"
                                    />
                                </span>
                            </button>
                            {isLineupOpen && <RosterList slots={team.rosterSlots} />}
                            {!isLineupOpen && (
                                <p className="mt-2 px-1 text-xs text-muted-foreground">
                                    Click to view the roster you saved.
                                </p>
                            )}

                            <div className="mt-5 flex items-center gap-1.5 text-xs text-muted-foreground">
                                <HugeiconsIcon icon={Clock01Icon} className="size-3.5" />
                                Saved {savedLabel(team.savedDaysAgo)}
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 border-t border-foreground/10 bg-card px-6 py-4">
                            <Link
                                href={`/teams/${team.id}/edit`}
                                className="flex w-full items-center justify-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                            >
                                <HugeiconsIcon icon={Edit02Icon} className="size-4" />
                                Edit lineup
                            </Link>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:brightness-95"
                                >
                                    <HugeiconsIcon icon={GameController01Icon} className="size-4" />
                                    Join tournament
                                </button>
                                <button
                                    type="button"
                                    onClick={onToggleFav}
                                    aria-pressed={isFav}
                                    className={cn(
                                        'flex items-center justify-center gap-2 rounded-md border border-foreground/15 px-3 py-2.5 text-sm transition-colors hover:bg-muted',
                                        isFav && 'text-primary',
                                    )}
                                >
                                    <HugeiconsIcon
                                        icon={StarIcon}
                                        className="size-4"
                                        fill={isFav ? 'currentColor' : 'none'}
                                    />
                                </button>
                                <button
                                    type="button"
                                    title="Duplicate"
                                    className="flex items-center justify-center rounded-md border border-foreground/15 px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
                                >
                                    <HugeiconsIcon icon={Copy01Icon} className="size-4" />
                                </button>
                                <button
                                    type="button"
                                    title="Delete"
                                    className="flex items-center justify-center rounded-md border border-foreground/15 px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                                >
                                    <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </aside>
        </>
    )
}

const BigStat = ({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) => (
    <div className="rounded-xl bg-muted/60 p-4 text-center">
        <div className={cn('font-anton text-3xl leading-none', accent && 'text-primary')}>{value}</div>
        <div className="mt-1.5 text-xs text-muted-foreground">{label}</div>
    </div>
)

const SmallStat = ({ label, value }: { label: string; value: string }) => (
    <div className="rounded-xl border border-foreground/10 p-3">
        <div className="font-anton text-xl leading-none">{value}</div>
        <div className="mt-1 text-[11px] text-muted-foreground">{label}</div>
    </div>
)

const RosterList = ({ slots }: { slots: TeamRosterSlot[] }) => {
    if (slots.length === 0) {
        return (
            <div className="mt-2 rounded-xl border border-dashed border-foreground/15 px-4 py-6 text-center text-xs text-muted-foreground">
                No players on this lineup yet.
            </div>
        )
    }
    const totalSalary = slots.reduce((sum, slot) => sum + slot.salaryAtLock, 0)
    return (
        <div className="mt-2 flex flex-col gap-1.5">
            <ul className="flex flex-col gap-1 rounded-xl border border-foreground/10 p-2">
                {slots.map((slot) => (
                    <li
                        key={slot.id}
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/40"
                    >
                        <span className="w-7 shrink-0 rounded bg-muted px-1.5 py-0.5 text-center text-[10px] font-semibold tracking-wide text-muted-foreground">
                            {slot.slotPosition}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                            {slot.playerName}
                        </span>
                        {slot.isCaptain && (
                            <HugeiconsIcon
                                icon={StarIcon}
                                className="size-3.5 text-primary"
                                fill="currentColor"
                            />
                        )}
                        <span className="shrink-0 text-xs text-muted-foreground">
                            {money(slot.salaryAtLock)}
                        </span>
                    </li>
                ))}
            </ul>
            <div className="flex items-center justify-between px-2 text-xs text-muted-foreground">
                <span>{slots.length} players</span>
                <span>Total {money(totalSalary)}</span>
            </div>
        </div>
    )
}
