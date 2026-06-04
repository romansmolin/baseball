// Pure scoring math. No I/O, no async, no React, no Prisma.
// Given a single provider stat line + a parsed ScoringRule, produces a number.
//
// Singles are derived (hits - 2B - 3B - HR) because the MLB box score gives
// total hits but no explicit "singles" stat. Two-way players (e.g. Ohtani)
// can appear in both the batter and pitcher lists for a single game; both
// contributions are summed by `scoreGameForPlayer`.

import type {
    ProviderBatterLine,
    ProviderBoxScore,
    ProviderPitcherLine,
} from '../../providers/dto/provider-schedule.dto'

import type { BaseballScoringRule } from './scoring-rule.schema'

export function scoreBatterLine(
    line: ProviderBatterLine,
    rule: BaseballScoringRule,
): number {
    const singles = line.hits - line.doubles - line.triples - line.homeRuns

    return (
        singles * rule.single +
        line.doubles * rule.double +
        line.triples * rule.triple +
        line.homeRuns * rule.homeRun +
        line.rbi * rule.rbi +
        line.runs * rule.runScored +
        line.stolenBases * rule.stolenBase +
        line.baseOnBalls * rule.walk +
        line.strikeOuts * rule.strikeoutBatter
    )
}

export function scorePitcherLine(
    line: ProviderPitcherLine,
    rule: BaseballScoringRule,
): number {
    return (
        line.inningsPitched * rule.inningPitched +
        line.strikeOuts * rule.strikeoutPitcher +
        line.earnedRuns * rule.earnedRunAllowed +
        (line.win ? rule.win : 0)
    )
}

export function scoreGameForPlayer(
    box: ProviderBoxScore,
    externalPlayerId: number,
    rule: BaseballScoringRule,
): number {
    const batter = box.batters.find((b) => b.externalPlayerId === externalPlayerId)
    const pitcher = box.pitchers.find((p) => p.externalPlayerId === externalPlayerId)

    let total = 0
    if (batter) total += scoreBatterLine(batter, rule)
    if (pitcher) total += scorePitcherLine(pitcher, rule)
    return total
}
