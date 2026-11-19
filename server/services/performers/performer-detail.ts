import type { GameLeague } from '../../../src/shared/games'
import type {
    PerformerComparison,
    PerformerDetail,
    PerformerGameEntry,
    PerformerGroup,
    PerformerStat,
} from '../../../src/shared/performers'
import type { ProviderPerformerLog } from '../../providers/dto/provider-performer.dto'
import type { StatLine } from '../../providers/dto/provider-player-profile.dto'
import {
    hittingLineFromGames,
    hittingLineFromSeason,
    pitchingLineFromGames,
    pitchingLineFromSeason,
} from '../analytics/stat-lines'

import { hittingBreakdown, hittingPoints, pitchingBreakdown, pitchingPoints } from './fantasy-points'

const SHOWN_GAMES = 15

interface PlayerBasics {
    id: number
    fullName: string
    primaryPosition: string | null
    teamName: string | null
}

const round1 = (value: number) => Math.round(value * 10) / 10

// Baseball style: .412, not 0.412.
const rate = (value: number | null, digits: number) =>
    value === null ? '—' : value.toFixed(digits).replace(/^0\./, '.')

export function buildPerformerDetail(input: {
    player: PlayerBasics
    league: GameLeague
    group: PerformerGroup
    log: ProviderPerformerLog
    // First day (YYYY-MM-DD) of the "top performers" window.
    windowStart: string
}): PerformerDetail {
    const { player, league, group, log, windowStart } = input
    const hitting = group === 'hitting'
    const pointsOf = hitting ? hittingPoints : pitchingPoints
    const breakdownOf = hitting ? hittingBreakdown : pitchingBreakdown

    const sorted = [...log.games].sort((a, b) => a.date.localeCompare(b.date))
    const stats = sorted.map((game) => game.stat)

    // Season-to-date trend after each game, from the games so far.
    const entries: PerformerGameEntry[] = sorted.map((game, i) => {
        const sofar = stats.slice(0, i + 1)
        return {
            date: game.date,
            opponent: game.opponentName,
            points: round1(pointsOf(game.stat)),
            inWindow: game.date >= windowStart,
            summary: String(game.stat.summary ?? ''),
            trend: hitting ? hittingLineFromGames(sofar).ops : pitchingLineFromGames(sofar).era,
        }
    })

    const windowStats = sorted.filter((game) => game.date >= windowStart).map((game) => game.stat)
    const points = round1(windowStats.reduce((sum, stat) => sum + pointsOf(stat), 0))
    const seasonPoints = stats.reduce((sum, stat) => sum + pointsOf(stat), 0)

    return {
        playerId: player.id,
        name: player.fullName,
        position: player.primaryPosition,
        teamName: player.teamName,
        group,
        league,
        windowGames: windowStats.length,
        points,
        pointsPerGame: windowStats.length > 0 ? round1(points / windowStats.length) : null,
        seasonPointsPerGame: stats.length > 0 ? round1(seasonPoints / stats.length) : null,
        stats: headline(group, windowStats),
        games: entries.slice(-SHOWN_GAMES),
        trendLabel: hitting ? 'OPS' : 'ERA',
        mix: mixOf(windowStats, breakdownOf),
        comparison: comparison(group, windowStats, log.season),
    }
}

function headline(group: PerformerGroup, windowStats: StatLine[]): PerformerStat[] {
    if (windowStats.length === 0) return []
    if (group === 'hitting') {
        const line = hittingLineFromGames(windowStats)
        return [
            { label: 'AVG', value: rate(line.avg, 3) },
            { label: 'OPS', value: rate(line.ops, 3) },
            { label: 'HR', value: String(line.homeRuns ?? 0) },
            { label: 'RBI', value: String(line.rbi ?? 0) },
            { label: 'SB', value: String(line.stolenBases ?? 0) },
        ]
    }
    const line = pitchingLineFromGames(windowStats)
    return [
        { label: 'IP', value: (line.inningsPitched ?? 0).toFixed(1) },
        { label: 'K', value: String(line.strikeOuts ?? 0) },
        { label: 'ERA', value: rate(line.era, 2) },
        { label: 'WHIP', value: rate(line.whip, 2) },
    ]
}

function mixOf(windowStats: StatLine[], breakdownOf: (line: StatLine) => { label: string; points: number }[]) {
    const totals = new Map<string, number>()
    for (const stat of windowStats) {
        for (const part of breakdownOf(stat)) totals.set(part.label, (totals.get(part.label) ?? 0) + part.points)
    }
    return [...totals]
        .map(([label, points]) => ({ label, points: round1(points) }))
        .filter((part) => part.points !== 0)
}

function comparison(group: PerformerGroup, windowStats: StatLine[], season: StatLine | null): PerformerComparison[] {
    if (windowStats.length === 0 || !season) return []
    if (group === 'hitting') {
        const w = hittingLineFromGames(windowStats)
        const s = hittingLineFromSeason(season)
        return [
            { label: 'AVG', window: w.avg, season: s.avg, lowerIsBetter: false, digits: 3 },
            { label: 'OBP', window: w.obp, season: s.obp, lowerIsBetter: false, digits: 3 },
            { label: 'SLG', window: w.slg, season: s.slg, lowerIsBetter: false, digits: 3 },
            { label: 'OPS', window: w.ops, season: s.ops, lowerIsBetter: false, digits: 3 },
        ]
    }
    const w = pitchingLineFromGames(windowStats)
    const s = pitchingLineFromSeason(season)
    return [
        { label: 'ERA', window: w.era, season: s.era, lowerIsBetter: true, digits: 2 },
        { label: 'WHIP', window: w.whip, season: s.whip, lowerIsBetter: true, digits: 2 },
        { label: 'K/9', window: w.strikeoutsPer9, season: s.strikeoutsPer9, lowerIsBetter: false, digits: 1 },
    ]
}
