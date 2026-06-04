'use client'

import {
    Cancel01Icon,
    ChampionIcon,
    GameController01Icon,
    Location01Icon,
    UserMultipleIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Link from 'next/link'
import { useEffect } from 'react'

import { cn } from '@/shared/utils'

import { REGION_LABEL } from '../model/league.type'
import type { League } from '../model/league.type'
import { SeasonBadge } from './league-card'

interface LeagueDetailDrawerProps {
    league: League | null
    onClose: () => void
}

const hexA = (hex: string, a: number) => {
    const n = parseInt(hex.slice(1), 16)
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

export const LeagueDetailDrawer = ({ league, onClose }: LeagueDetailDrawerProps) => {
    const isOpen = league !== null

    useEffect(() => {
        if (!isOpen) return
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [isOpen, onClose])

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
                {league && <DrawerContent league={league} onClose={onClose} />}
            </aside>
        </>
    )
}

const DrawerContent = ({ league, onClose }: { league: League; onClose: () => void }) => {
    const isLive = league.season === 'live'
    const hasTournaments = league.openTournaments > 0

    return (
        <>
            <div className="flex-1 overflow-y-auto">
                <div className="relative">
                    <div
                        className="h-24"
                        style={{
                            background: `linear-gradient(135deg, ${hexA(league.color, 0.18)}, ${hexA(league.color, 0.04)})`,
                        }}
                    />
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute top-4 right-4 rounded-md bg-card/70 p-1.5 text-foreground backdrop-blur transition-colors hover:bg-card"
                    >
                        <HugeiconsIcon icon={Cancel01Icon} className="size-5" />
                    </button>
                    <div className="px-6">
                        <div className="-mt-9 flex items-end gap-4">
                            <span
                                className="flex size-20 shrink-0 items-center justify-center rounded-2xl border-4 border-card font-anton text-2xl shadow-sm"
                                style={{ backgroundColor: hexA(league.color, 0.15), color: league.color }}
                            >
                                {league.name}
                            </span>
                            <div className="pb-1">
                                <div className="font-anton text-2xl leading-tight tracking-wide">
                                    {league.name}
                                </div>
                                <div className="text-sm text-muted-foreground">{league.full}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-5">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <SeasonBadge season={league.season} />
                        <span className="flex items-center gap-1.5 rounded-full border border-foreground/15 px-2 py-0.5 text-xs text-muted-foreground">
                            <span
                                className="size-2 rounded-full"
                                style={{ backgroundColor: league.color }}
                            />
                            {REGION_LABEL[league.region]}
                        </span>
                        <span className="flex items-center gap-1 rounded-full border border-foreground/15 px-2 py-0.5 text-xs text-muted-foreground">
                            <HugeiconsIcon icon={Location01Icon} className="size-3" />
                            {league.country}
                        </span>
                    </div>

                    <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                        {league.description}
                    </p>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                        <BigStat label="Open tournaments" value={String(league.openTournaments)} accent />
                        <BigStat label="Total prize pool" value={league.prizePool} />
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                        <SmallStat label="Pro teams" value={String(league.proTeams)} />
                        <SmallStat label="My teams" value={String(league.myTeams)} />
                        <SmallStat label="Formats" value={String(league.formats.length)} />
                    </div>

                    <div className="mt-5">
                        <div className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                            Available formats
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {league.formats.map((f) => (
                                <span
                                    key={f}
                                    className="rounded-full border border-foreground/15 px-2.5 py-1 text-xs text-foreground"
                                >
                                    {f}
                                </span>
                            ))}
                        </div>
                    </div>

                    {isLive && (
                        <div className="mt-5 flex items-center justify-between rounded-xl border border-foreground/10 px-4 py-3">
                            <div className="flex items-center gap-2.5">
                                <HugeiconsIcon icon={ChampionIcon} className="size-4 text-primary" />
                                <div>
                                    <div className="text-sm font-medium">{league.topScorer}</div>
                                    <div className="text-xs text-muted-foreground">
                                        Top scorer this season
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-anton text-lg leading-none text-primary">
                                    {league.topPoints.toFixed(1)}
                                </div>
                                <div className="text-[11px] text-muted-foreground">pts</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex gap-2 border-t border-foreground/10 bg-card px-6 py-4">
                {isLive && hasTournaments ? (
                    <Link
                        href={`/tournaments?league=${encodeURIComponent(league.slug)}`}
                        className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:brightness-95"
                    >
                        <HugeiconsIcon icon={GameController01Icon} className="size-4" />
                        Browse tournaments
                    </Link>
                ) : (
                    <button
                        type="button"
                        disabled
                        title={
                            isLive
                                ? 'No tournaments scheduled for this league yet'
                                : 'This league is between seasons'
                        }
                        className="flex flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-md bg-muted px-4 py-2.5 text-sm font-medium text-muted-foreground"
                    >
                        <HugeiconsIcon icon={GameController01Icon} className="size-4" />
                        {isLive ? 'No tournaments yet' : 'Off-season'}
                    </button>
                )}
                <Link
                    href="/teams"
                    className="flex items-center justify-center gap-2 rounded-md border border-foreground/15 px-4 py-2.5 text-sm transition-colors hover:bg-muted"
                >
                    <HugeiconsIcon icon={UserMultipleIcon} className="size-4" />
                    My teams
                </Link>
            </div>
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
