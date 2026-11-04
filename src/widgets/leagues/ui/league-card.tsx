'use client'

import { ArrowRight01Icon, Location01Icon, UserMultipleIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import type { League } from '../model/league.type'

interface LeagueCardProps {
    league: League
    onSelect: () => void
}

export const LeagueCard = ({ league, onSelect }: LeagueCardProps) => {
    const handleKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onSelect()
        }
    }

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onSelect}
            onKeyDown={handleKey}
            className="group flex cursor-pointer flex-col gap-4 rounded-lg border border-border bg-card p-5 text-left transition-colors hover:border-board focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
            <div className="flex items-start gap-3">
                <span
                    className="flex h-14 w-[5.25rem] shrink-0 items-center justify-center rounded-md bg-board font-anton text-xl whitespace-nowrap"
                    style={{ color: league.color }}
                >
                    {league.name}
                </span>
                <div className="min-w-0 flex-1">
                    <div className="truncate text-base leading-tight font-semibold">{league.full}</div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <HugeiconsIcon icon={Location01Icon} className="size-3.5" />
                        {league.country}
                    </div>
                    <div className="mt-2">
                        {league.providerBacked ? (
                            <SeasonBadge season={league.season} />
                        ) : (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                Coming soon
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-[0.7fr_1.5fr_0.8fr] gap-2 rounded-md bg-board px-3 py-3 text-board-foreground">
                <Stat label="Open" value={String(league.openTournaments)} accent />
                <Stat label="Prize pool" value={league.prizePool} />
                <Stat label="Teams" value={String(league.proTeams)} />
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <HugeiconsIcon icon={UserMultipleIcon} className="size-3.5" />
                    {league.myTeams} of your teams
                </div>
                <span className="flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    Details <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" />
                </span>
            </div>
        </div>
    )
}

const Stat = ({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) => (
    <div>
        <div
            className={
                accent
                    ? 'font-anton text-2xl leading-none whitespace-nowrap text-lamp'
                    : 'font-anton text-2xl leading-none whitespace-nowrap'
            }
        >
            {value}
        </div>
        <div className="mt-1 text-xs text-board-foreground/60">{label}</div>
    </div>
)

export const SeasonBadge = ({ season }: { season: League['season'] }) =>
    season === 'live' ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-board/10 px-2 py-0.5 text-xs font-medium text-board">
            <span className="size-1.5 rounded-full bg-board" /> In season
        </span>
    ) : (
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            Off-season
        </span>
    )
