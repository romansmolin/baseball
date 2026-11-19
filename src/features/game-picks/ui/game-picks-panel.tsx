'use client'

import Link from 'next/link'

import { cn } from '@/shared/utils'

import { useGamePicks } from '../model/use-game-picks'
import type { PickRole } from '../model/types'

const ROLE_LABEL: Record<PickRole, string> = { start: 'Start', sit: 'Sit', watch: 'Watch' }
const ROLE_STYLE: Record<PickRole, string> = {
    start: 'bg-[#22c55e]/10 text-[#16a34a]',
    sit: 'bg-[#ef4444]/12 text-[#dc2626]',
    watch: 'bg-muted text-muted-foreground',
}

export const GamePicksPanel = ({ gamePk }: { gamePk: number }) => {
    const g = useGamePicks(gamePk)

    return (
        <section className="space-y-4 rounded-xl border border-foreground/10 p-4">
            <div>
                <h2 className="font-medium">AI picks for this game</h2>
                <p className="text-sm text-muted-foreground">
                    Who to start, sit or watch, based on the estimate, starters, form, splits and weather.
                </p>
            </div>

            {g.teams.length > 0 && (
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    Tailor to my team
                    <select
                        value={g.teamId ?? ''}
                        onChange={(e) => g.setTeamId(e.target.value || undefined)}
                        className="rounded-md border border-foreground/15 bg-card px-2 py-1 text-sm text-foreground"
                    >
                        <option value="">No team</option>
                        {g.teams.map((team) => (
                            <option key={team.id} value={team.id}>{team.name}</option>
                        ))}
                    </select>
                </label>
            )}

            {!g.confirming ? (
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        disabled={!g.canAfford || g.isRunning}
                        onClick={g.askToConfirm}
                        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                    >
                        {g.isRunning ? 'Working…' : `Get picks · ${g.cost} credits`}
                    </button>
                    <span className="text-xs text-muted-foreground">
                        Balance: {g.balance ?? '—'} credits
                        {!g.canAfford && g.balance !== undefined && (
                            <>
                                {' · '}
                                <Link href="/wallet" className="underline">
                                    Add {g.shortBy} more
                                </Link>
                            </>
                        )}
                    </span>
                </div>
            ) : (
                <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted/50 p-3 text-sm">
                    <span>Spend {g.cost} credits? You are only charged if the picks come back.</span>
                    <button type="button" onClick={g.run} className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground">
                        Yes, spend {g.cost}
                    </button>
                    <button type="button" onClick={g.cancelConfirm} className="rounded-md border border-foreground/15 px-3 py-1.5">
                        Cancel
                    </button>
                </div>
            )}

            {g.error && <p className="text-sm text-[#dc2626]">{g.error.message}</p>}

            {g.picks && (
                <div className="space-y-3">
                    <p className="text-sm">{g.picks.summary}</p>
                    <ul className="space-y-2">
                        {g.picks.picks.map((pick) => (
                            <li key={pick.playerId} className="flex gap-3 rounded-lg border border-foreground/10 p-3">
                                <span className={cn('h-fit rounded-full px-2 py-0.5 text-xs font-medium', ROLE_STYLE[pick.role])}>
                                    {ROLE_LABEL[pick.role]}
                                </span>
                                <div className="min-w-0 text-sm">
                                    <div className="font-medium">{pick.playerName}</div>
                                    <div className="text-muted-foreground">{pick.reason}</div>
                                </div>
                            </li>
                        ))}
                    </ul>
                    <p className="text-xs text-muted-foreground">AI suggestions for fantasy decisions, not betting advice.</p>
                </div>
            )}
        </section>
    )
}
