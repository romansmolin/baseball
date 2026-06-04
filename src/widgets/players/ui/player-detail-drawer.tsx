'use client'

import { Cancel01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useEffect } from 'react'

import { cn } from '@/shared/utils'

import { AVAILABILITY } from '../model/player.type'
import type { DrawerTab, League, Player } from '../model/player.type'
import { PlayerInjuriesTab } from './tabs/player-injuries-tab'
import { PlayerMetricsTab } from './tabs/player-metrics-tab'
import { PlayerStatsTab } from './tabs/player-stats-tab'
import { PlayerTransfersTab } from './tabs/player-transfers-tab'

interface PlayerDetailDrawerProps {
    player: Player | null
    league: League | undefined
    drawerTab: DrawerTab
    onClose: () => void
    onTabChange: (tab: DrawerTab) => void
}

const TABS: { value: DrawerTab; label: string }[] = [
    { value: 'stats', label: 'Stats' },
    { value: 'injuries', label: 'Injuries' },
    { value: 'transfers', label: 'Transfers' },
    { value: 'metrics', label: 'Metrics' },
]

const initials = (name: string) =>
    name
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()

const hexA = (hex: string, a: number) => {
    const n = parseInt(hex.slice(1), 16)
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

export const PlayerDetailDrawer = ({
    player,
    league,
    drawerTab,
    onClose,
    onTabChange,
}: PlayerDetailDrawerProps) => {
    const isOpen = player !== null

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
                {player && (
                    <DrawerContent
                        player={player}
                        league={league}
                        drawerTab={drawerTab}
                        onClose={onClose}
                        onTabChange={onTabChange}
                    />
                )}
            </aside>
        </>
    )
}

const DrawerContent = ({
    player,
    league,
    drawerTab,
    onClose,
    onTabChange,
}: {
    player: Player
    league: League | undefined
    drawerTab: DrawerTab
    onClose: () => void
    onTabChange: (tab: DrawerTab) => void
}) => {
    const color = league?.color ?? '#999999'
    const leagueName = league?.name ?? player.leagueSlug.toUpperCase()
    const availability = AVAILABILITY[player.status]

    return (
        <>
            <div className="relative shrink-0">
                <div
                    className="h-20"
                    style={{
                        background: `linear-gradient(135deg, ${hexA(color, 0.18)}, ${hexA(color, 0.04)})`,
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
                    <div className="-mt-8 flex items-end gap-4">
                        <span
                            className="relative flex size-18 shrink-0 items-center justify-center rounded-2xl border-4 border-card font-anton text-2xl shadow-sm"
                            style={{ backgroundColor: hexA(color, 0.15), color }}
                        >
                            {initials(player.name)}
                            <span
                                className="absolute -right-1 -bottom-1 size-4 rounded-full border-2 border-card"
                                style={{ backgroundColor: availability.dot }}
                            />
                        </span>
                        <div className="pb-1">
                            <div className="font-anton text-2xl leading-tight tracking-wide">
                                {player.name}
                            </div>
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold">
                                    {player.pos}
                                </span>
                                {player.team} · {leagueName}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="shrink-0 px-6 pt-4">
                <div className="flex flex-wrap items-center gap-1.5">
                    <span
                        className={cn(
                            'flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
                            availability.bgClass,
                            availability.textClass,
                        )}
                    >
                        <span
                            className="size-1.5 rounded-full"
                            style={{ backgroundColor: availability.dot }}
                        />
                        {availability.label}
                    </span>
                    <span className="rounded-full border border-foreground/15 px-2 py-0.5 text-xs text-muted-foreground">
                        Age {player.age}
                    </span>
                    <span className="rounded-full border border-foreground/15 px-2 py-0.5 text-xs text-muted-foreground">
                        Bats {player.bats}
                    </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <StatTile label="Proj. pts" value={player.proj.toFixed(1)} accent />
                    <StatTile label="Avg pts" value={player.avg.toFixed(1)} />
                    <StatTile label="Owned" value={`${player.own}%`} />
                </div>
            </div>

            <div className="mt-4 flex shrink-0 gap-1 border-b border-foreground/10 px-6">
                {TABS.map((tab) => {
                    const isActive = tab.value === drawerTab
                    return (
                        <button
                            key={tab.value}
                            type="button"
                            onClick={() => onTabChange(tab.value)}
                            className={cn(
                                'relative px-3 py-2.5 text-sm font-medium transition-colors',
                                isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {tab.label}
                            {isActive && (
                                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
                            )}
                        </button>
                    )
                })}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
                {drawerTab === 'stats' && <PlayerStatsTab player={player} />}
                {drawerTab === 'injuries' && <PlayerInjuriesTab player={player} />}
                {drawerTab === 'transfers' && <PlayerTransfersTab player={player} />}
                {drawerTab === 'metrics' && <PlayerMetricsTab player={player} league={league} />}
            </div>
        </>
    )
}

const StatTile = ({
    label,
    value,
    accent = false,
}: {
    label: string
    value: string
    accent?: boolean
}) => (
    <div className="rounded-xl bg-muted/60 p-3">
        <div className={cn('font-anton text-2xl leading-none', accent && 'text-primary')}>
            {value}
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">{label}</div>
    </div>
)
