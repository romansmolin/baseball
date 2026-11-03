import { ChartLineData01Icon } from '@hugeicons/core-free-icons'

import type { Player } from '../../model/player.type'
import { formatPlayerStatLabel } from '../../model/player-display'
import { TabEmptyState } from './tab-empty-state'

export const PlayerStatsTab = ({ player }: { player: Player }) => {
    const statGroups = [
        ['Batting', player.battingStats],
        ['Pitching', player.pitchingStats],
    ].filter((group): group is [string, Record<string, string | number>] =>
        Object.keys(group[1] ?? {}).length > 0,
    )

    if (statGroups.length === 0) {
        return (
            <TabEmptyState
                icon={ChartLineData01Icon}
                title="Season stats unavailable"
                description={`No ${player.statsSeason} season batting or pitching line is available for this player.`}
            />
        )
    }

    return (
        <div className="space-y-6">
            <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                {player.statsSeason} season
            </div>
            {statGroups.map(([groupName, stats]) => (
                <section key={groupName}>
                    <h3 className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                        {groupName}
                    </h3>
                    <div className="grid grid-cols-2 gap-2.5">
                        {Object.entries(stats).map(([key, value]) => (
                            <div
                                key={key}
                                className="flex items-center justify-between gap-3 rounded-lg border border-foreground/10 px-3 py-2.5"
                            >
                                <span className="text-sm text-muted-foreground">
                                    {formatPlayerStatLabel(key)}
                                </span>
                                <span className="font-mono text-sm font-semibold tabular-nums">
                                    {String(value)}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    )
}
