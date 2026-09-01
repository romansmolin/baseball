'use client'

import { Search01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import type {
    PoolPlayer,
    PoolPositionFilter,
} from '@/shared/team-builder'
import { cn } from '@/shared/utils'

import type { PlayerPlacement } from '../model/team-builder-roster'
import { PlayerPoolRow } from './player-pool-row'

const POSITION_OPTIONS: { value: PoolPositionFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'P', label: 'P' },
    { value: 'C', label: 'C' },
    { value: '1B', label: '1B' },
    { value: '2B', label: '2B' },
    { value: '3B', label: '3B' },
    { value: 'SS', label: 'SS' },
    { value: 'OF', label: 'OF' },
]

interface PlayerPoolProps {
    pool: PoolPlayer[]
    search: string
    position: PoolPositionFilter
    isLoading: boolean
    error: Error | undefined
    selectedTeamId: number | null
    onRetry: () => void
    onSearch: (q: string) => void
    onPositionChange: (pos: PoolPositionFilter) => void
    onAdd: (id: number) => void
    placementFor: (player: PoolPlayer) => PlayerPlacement
}

const SKELETON_ROWS = 7

export const PlayerPool = ({
    pool,
    search,
    position,
    isLoading,
    error,
    selectedTeamId,
    onRetry,
    onSearch,
    onPositionChange,
    onAdd,
    placementFor,
}: PlayerPoolProps) => {
    const showNoTeam = selectedTeamId == null
    const showError = !showNoTeam && !!error
    const showLoading = !showNoTeam && !showError && isLoading
    const showEmpty =
        !showNoTeam && !showError && !showLoading && pool.length === 0
    const showRows = !showNoTeam && !showError && !showLoading && pool.length > 0

    const shownCountLabel = showRows ? `${pool.length} shown` : ''

    return (
        <section className="flex min-h-0 flex-col rounded-2xl border border-foreground/10">
            <div className="border-b border-foreground/10 p-4">
                <div className="mb-3 flex items-center justify-between">
                    <div className="font-medium">Player pool</div>
                    <div className="text-xs text-muted-foreground">{shownCountLabel}</div>
                </div>

                <div className="relative mb-3">
                    <HugeiconsIcon
                        icon={Search01Icon}
                        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                        type="text"
                        placeholder="Search players…"
                        value={search}
                        onChange={(e) => onSearch(e.target.value)}
                        disabled={showNoTeam}
                        className="w-full rounded-lg border border-foreground/15 bg-card py-2 pr-3 pl-9 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                    {POSITION_OPTIONS.map((opt) => {
                        const isActive = opt.value === position
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => onPositionChange(opt.value)}
                                disabled={showNoTeam}
                                className={cn(
                                    'rounded-full px-2.5 py-1 text-xs transition-colors',
                                    isActive
                                        ? 'bg-primary text-primary-foreground'
                                        : 'border border-foreground/15 text-muted-foreground hover:bg-muted',
                                    showNoTeam && 'cursor-not-allowed opacity-60',
                                )}
                            >
                                {opt.label}
                            </button>
                        )
                    })}
                </div>
            </div>

            <div className="max-h-[560px] flex-1 space-y-1.5 overflow-y-auto p-3">
                {showNoTeam ? (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                        Pick a team to see players.
                    </div>
                ) : null}

                {showError ? (
                    <div className="flex flex-col items-center gap-2 py-12 text-center">
                        <div className="text-sm text-destructive">
                            Failed to load players.
                        </div>
                        <button
                            type="button"
                            onClick={onRetry}
                            className="rounded-md border border-foreground/15 px-3 py-1.5 text-xs transition-colors hover:bg-muted"
                        >
                            Retry
                        </button>
                    </div>
                ) : null}

                {showLoading
                    ? Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                          <div
                              key={i}
                              className="flex items-center gap-3 rounded-xl border border-foreground/10 bg-card px-3 py-2"
                          >
                              <div className="size-9 shrink-0 animate-pulse rounded-full bg-muted" />
                              <div className="min-w-0 flex-1 space-y-2">
                                  <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                                  <div className="h-2.5 w-1/3 animate-pulse rounded bg-muted" />
                              </div>
                              <div className="h-7 w-14 shrink-0 animate-pulse rounded-md bg-muted" />
                          </div>
                      ))
                    : null}

                {showEmpty ? (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                        No players match your filters.
                    </div>
                ) : null}

                {showRows
                    ? pool.map((player) => {
                          const placement = placementFor(player)
                          return (
                              <PlayerPoolRow
                                  key={player.id}
                                  player={player}
                                  placement={placement}
                                  onAdd={() => onAdd(player.id)}
                              />
                          )
                      })
                    : null}
            </div>
        </section>
    )
}
