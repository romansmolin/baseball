'use client'

import type { ApiError } from '@/shared/api/api-error'
import type { TournamentStandingsResponse } from '@/shared/tournaments'

interface StandingsTableProps {
    standings: TournamentStandingsResponse | undefined
    isLoading: boolean
    error: ApiError | undefined
    limit?: number
}

const DEFAULT_LIMIT = 10

export const StandingsTable = ({
    standings,
    isLoading,
    error,
    limit = DEFAULT_LIMIT,
}: StandingsTableProps) => {
    if (isLoading && !standings) {
        return (
            <div className="flex flex-col gap-2">
                {[0, 1, 2, 3, 4].map((i) => (
                    <div
                        key={i}
                        className="flex items-center justify-between rounded-md bg-muted/40 p-2"
                    >
                        <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                        <div className="h-3 w-12 animate-pulse rounded bg-muted" />
                    </div>
                ))}
            </div>
        )
    }

    if (error) {
        return (
            <div className="text-xs text-muted-foreground">
                Couldn&apos;t load standings.{error.message ? ` ${error.message}` : ''}
            </div>
        )
    }

    if (!standings || standings.items.length === 0) {
        return (
            <div className="text-xs text-muted-foreground">
                No members have joined yet.
            </div>
        )
    }

    const visible = standings.items.slice(0, limit)

    return (
        <div className="flex flex-col gap-1">
            <div className="grid grid-cols-[2rem_1fr_4rem] items-center gap-2 px-2 pb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                <span>#</span>
                <span>Team</span>
                <span className="text-right">Points</span>
            </div>
            {visible.map((row) => (
                <div
                    key={row.leagueMemberId}
                    className="grid grid-cols-[2rem_1fr_4rem] items-center gap-2 rounded-md px-2 py-1.5 text-sm odd:bg-muted/30"
                >
                    <span className="font-medium text-muted-foreground">{row.rank}</span>
                    <span className="min-w-0">
                        <span className="block truncate font-medium">{row.teamName}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                            {row.userName}
                        </span>
                    </span>
                    <span className="text-right font-anton text-primary">
                        {row.totalPoints.toLocaleString()}
                    </span>
                </div>
            ))}
            {standings.items.length > limit && (
                <div className="px-2 pt-1 text-xs text-muted-foreground">
                    +{standings.items.length - limit} more
                </div>
            )}
        </div>
    )
}
