// Pure formatter: turns a player's box-score lines for one game into a short
// human-readable stat line ("2 H · 1 HR · 3 RBI"). Zero stats are omitted.

import type {
    ProviderBatterLine,
    ProviderBoxScore,
    ProviderPitcherLine,
} from '../../providers/dto/provider-schedule.dto'

// 6.667 -> "6.2" (baseball notation: whole innings, then outs).
function formatInnings(innings: number): string {
    const totalOuts = Math.round(innings * 3)
    return `${Math.floor(totalOuts / 3)}.${totalOuts % 3}`
}

function battingParts(line: ProviderBatterLine): string[] {
    const parts: [number, string][] = [
        [line.hits, 'H'],
        [line.doubles, '2B'],
        [line.triples, '3B'],
        [line.homeRuns, 'HR'],
        [line.rbi, 'RBI'],
        [line.runs, 'R'],
        [line.stolenBases, 'SB'],
        [line.baseOnBalls, 'BB'],
        [line.strikeOuts, 'K'],
    ]
    return parts.filter(([n]) => n > 0).map(([n, label]) => `${n} ${label}`)
}

function pitchingParts(line: ProviderPitcherLine): string[] {
    const parts = [`${formatInnings(line.inningsPitched)} IP`]
    if (line.strikeOuts > 0) parts.push(`${line.strikeOuts} K`)
    parts.push(`${line.earnedRuns} ER`)
    if (line.win) parts.push('W')
    return parts
}

// Returns undefined when the player has no line in this game.
export function formatGameStatLine(
    box: ProviderBoxScore,
    externalPlayerId: number,
): string | undefined {
    const batter = box.batters.find((b) => b.externalPlayerId === externalPlayerId)
    const pitcher = box.pitchers.find((p) => p.externalPlayerId === externalPlayerId)

    const parts = [
        ...(batter ? battingParts(batter) : []),
        ...(pitcher ? pitchingParts(pitcher) : []),
    ]
    return parts.length > 0 ? parts.join(' · ') : undefined
}
