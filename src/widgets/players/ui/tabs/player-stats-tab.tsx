import { ChartLineData01Icon } from '@hugeicons/core-free-icons'

import { isPitcher } from '../../model/player.type'
import type { Player } from '../../model/player.type'
import { TabEmptyState } from './tab-empty-state'

const BATTING_LABELS: Record<string, string> = {
    AVG: 'AVG',
    HR: 'Home runs',
    RBI: 'RBI',
    OBP: 'OBP',
    SLG: 'SLG',
    SB: 'Stolen bases',
    R: 'Runs',
    H: 'Hits',
}

const PITCHING_LABELS: Record<string, string> = {
    ERA: 'ERA',
    W: 'Wins',
    SO: 'Strikeouts',
    WHIP: 'WHIP',
    IP: 'Innings',
    SV: 'Saves',
}

export const PlayerStatsTab = ({ player }: { player: Player }) => {
    const pitcher = isPitcher(player)
    const stats = pitcher ? player.pitch : player.bat
    const labels = pitcher ? PITCHING_LABELS : BATTING_LABELS

    if (!stats) {
        return (
            <TabEmptyState
                icon={ChartLineData01Icon}
                title="No season stats yet"
                description="Batting and pitching lines aren't available for this player from the sports provider."
            />
        )
    }

    return (
        <>
            <div className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                {pitcher ? 'Pitching' : 'Batting'} — 2026 season
            </div>
            <div className="grid grid-cols-2 gap-2.5">
                {Object.entries(stats).map(([k, v]) => (
                    <div
                        key={k}
                        className="flex items-center justify-between rounded-lg border border-foreground/10 px-3 py-2.5"
                    >
                        <span className="text-sm text-muted-foreground">{labels[k] ?? k}</span>
                        <span className="font-mono text-sm font-semibold">{String(v)}</span>
                    </div>
                ))}
            </div>
        </>
    )
}
