import type {
    ProviderBatterLine,
    ProviderBoxScore,
    ProviderGameStatus,
    ProviderPitcherLine,
} from '../../dto/provider-schedule.dto'
import type {
    MlbRawBoxScorePlayer,
    MlbRawBoxScoreResponse,
    MlbRawBoxScoreTeam,
} from '../types/mlb-boxscore.raw'

export function mapMlbBoxScoreToProvider(
    raw: MlbRawBoxScoreResponse,
    gamePk: number,
    status: ProviderGameStatus,
): ProviderBoxScore {
    const batters: ProviderBatterLine[] = []
    const pitchers: ProviderPitcherLine[] = []

    collectTeamStats(raw.teams.home, batters, pitchers)
    collectTeamStats(raw.teams.away, batters, pitchers)

    return { gamePk, status, batters, pitchers }
}

// Parses MLB's quirky "IP.outs" string format. "6.0" → 6, "6.1" → 6.333…,
// "6.2" → 6.666…. The fractional digit counts outs (0/1/2), not tenths,
// so the formula is floor(value) + (.X * 1/3).
export function parseInningsPitched(value: string | undefined): number {
    if (value == null) return 0
    const parsed = parseFloat(value)
    if (!Number.isFinite(parsed)) return 0
    const whole = Math.floor(parsed)
    // Take the .X digit directly from the string to avoid float dust like
    // 6.2 - 6 = 0.19999... that would round to 0 outs.
    const dotIndex = value.indexOf('.')
    const fractionStr = dotIndex >= 0 ? value.slice(dotIndex + 1, dotIndex + 2) : '0'
    const outs = parseInt(fractionStr, 10)
    const safeOuts = Number.isFinite(outs) && outs >= 0 && outs <= 2 ? outs : 0
    return whole + safeOuts / 3
}

function collectTeamStats(
    team: MlbRawBoxScoreTeam,
    batters: ProviderBatterLine[],
    pitchers: ProviderPitcherLine[],
): void {
    for (const player of Object.values(team.players)) {
        const batting = player.stats?.batting
        if (batting) {
            batters.push(mapBatterLine(player, batting))
        }
        const pitching = player.stats?.pitching
        if (pitching) {
            pitchers.push(mapPitcherLine(player, pitching))
        }
    }
}

function mapBatterLine(
    player: MlbRawBoxScorePlayer,
    batting: NonNullable<NonNullable<MlbRawBoxScorePlayer['stats']>['batting']>,
): ProviderBatterLine {
    return {
        externalPlayerId: player.person.id,
        hits: batting.hits ?? 0,
        doubles: batting.doubles ?? 0,
        triples: batting.triples ?? 0,
        homeRuns: batting.homeRuns ?? 0,
        rbi: batting.rbi ?? 0,
        runs: batting.runs ?? 0,
        stolenBases: batting.stolenBases ?? 0,
        baseOnBalls: batting.baseOnBalls ?? 0,
        strikeOuts: batting.strikeOuts ?? 0,
    }
}

function mapPitcherLine(
    player: MlbRawBoxScorePlayer,
    pitching: NonNullable<NonNullable<MlbRawBoxScorePlayer['stats']>['pitching']>,
): ProviderPitcherLine {
    return {
        externalPlayerId: player.person.id,
        inningsPitched: parseInningsPitched(pitching.inningsPitched),
        strikeOuts: pitching.strikeOuts ?? 0,
        earnedRuns: pitching.earnedRuns ?? 0,
        win: pitching.wins === 1,
    }
}
