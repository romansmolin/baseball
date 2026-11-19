import type { ProviderPlayer } from '../../providers/dto/provider-player.dto'
import type { ProviderTeamStanding } from '../../providers/dto/provider-team-standing.dto'
import type { ProviderTeamRecord } from '../../providers/dto/provider-game-context.dto'
import { innings, num } from '../../shared/stat-parse'

import type { StarterStrength, TeamStrength } from './game-estimate'

const winPct = (wins: number, losses: number): number | null =>
    wins + losses > 0 ? wins / (wins + losses) : null

// Standings first; the schedule's own record when the standings have no row; a coin flip before any game is played.
export function teamStrengthFor(
    teamId: number,
    standings: Map<number, ProviderTeamStanding>,
    scheduleRecord: ProviderTeamRecord | null,
): TeamStrength {
    const row = standings.get(teamId)
    const season = row ? winPct(row.wins, row.losses) : scheduleRecord ? winPct(scheduleRecord.wins, scheduleRecord.losses) : null
    const lastTen = row?.lastTen ? winPct(row.lastTen.wins, row.lastTen.losses) : null

    const seasonRate = season ?? 0.5
    return { winPct: seasonRate, last10WinPct: lastTen ?? seasonRate }
}

export function starterStrengthFrom(pitcher: ProviderPlayer | null): StarterStrength | null {
    const stats = pitcher?.pitchingStats
    if (!stats) return null
    const era = num(stats.era)
    const inningsPitched = innings(stats.inningsPitched)
    return era === null || inningsPitched === null ? null : { era, inningsPitched }
}
