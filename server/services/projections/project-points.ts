import type { ProjectedStats } from '../../../src/shared/team-builder'
import type { ProviderPlayer } from '../../providers/dto/provider-player.dto'
import { innings, num } from '../../shared/stat-parse'
import {
    PROJECTION_LOW_INNINGS,
    PROJECTION_LOW_PLATE_APPEARANCES,
    ROTATION_GAMES_PER_START,
    STARTER_MIN_START_SHARE,
} from '../estimates/estimates.const'

import type { Projection, ProjectionInput } from './projections.type'

type Stats = NonNullable<ProviderPlayer['battingStats']>

const round1 = (value: number) => Math.round(value * 10) / 10
const round2 = (value: number) => Math.round(value * 100) / 100

const EMPTY_STATS = { r: 0, hr: 0, rbi: 0, sb: 0, ab: 0, h: 0, w: 0, sv: 0, k: 0, ip: 0, er: 0, bbh: 0 }

const stat = (line: Stats, key: string) => num(line[key]) ?? 0

// Share of the team's games the player actually appeared in.
function availability(gamesPlayed: number, teamSeasonGames: number | null): number {
    return teamSeasonGames && teamSeasonGames > 0 ? Math.min(1, gamesPlayed / teamSeasonGames) : 1
}

export function projectPlayerPoints(input: ProjectionInput): Projection {
    const { player, teamGames, basis } = input
    const blank = (reason: Projection['reason']): Projection => ({
        points: null, games: 0, starts: 0, confidence: 'normal', basis, reason,
    })

    if (!player.active) return blank('INACTIVE')
    if (teamGames <= 0) return blank('NO_GAMES')

    const isPitcher = player.primaryPosition === 'SP' || player.primaryPosition === 'RP'
    return isPitcher ? projectPitcher(input) : projectHitter(input)
}

function projectHitter({ player, teamGames, basis, teamSeasonGames, rules }: ProjectionInput): Projection {
    const line = player.battingStats
    const gamesPlayed = line ? stat(line, 'gamesPlayed') : 0
    if (!line || gamesPlayed <= 0) return { points: null, games: 0, starts: 0, confidence: 'normal', basis, reason: 'NO_STATS' }

    const hits = stat(line, 'hits')
    const doubles = stat(line, 'doubles')
    const triples = stat(line, 'triples')
    const homeRuns = stat(line, 'homeRuns')
    const r = rules.hitting
    const seasonPoints =
        (hits - doubles - triples - homeRuns) * r.single +
        doubles * r.double +
        triples * r.triple +
        homeRuns * r.homeRun +
        stat(line, 'runs') * r.run +
        stat(line, 'rbi') * r.rbi +
        stat(line, 'baseOnBalls') * r.walk +
        stat(line, 'hitByPitch') * r.hitByPitch +
        stat(line, 'stolenBases') * r.stolenBase +
        stat(line, 'strikeOuts') * r.strikeOut

    const games = teamGames * availability(gamesPlayed, teamSeasonGames)
    const perGame = (key: string) => round2((stat(line, key) / gamesPlayed) * games)
    return {
        points: round1((seasonPoints / gamesPlayed) * games),
        games: round1(games),
        starts: 0,
        confidence: stat(line, 'plateAppearances') < PROJECTION_LOW_PLATE_APPEARANCES ? 'low' : 'normal',
        basis,
        stats: {
            ...EMPTY_STATS,
            side: 'hitting',
            r: perGame('runs'),
            hr: perGame('homeRuns'),
            rbi: perGame('rbi'),
            sb: perGame('stolenBases'),
            ab: perGame('atBats'),
            h: perGame('hits'),
        },
    }
}

function projectPitcher({ player, teamGames, basis, teamSeasonGames, announcedStarts, unannouncedTeamGames, rules }: ProjectionInput): Projection {
    const line = player.pitchingStats
    const inningsPitched = line ? (innings(line.inningsPitched) ?? 0) : 0
    const gamesPlayed = line ? stat(line, 'gamesPlayed') : 0
    if (!line || gamesPlayed <= 0 || inningsPitched <= 0) {
        return { points: null, games: 0, starts: 0, confidence: 'normal', basis, reason: 'NO_STATS' }
    }

    const r = rules.pitching
    const seasonPoints =
        inningsPitched * r.inningPitched +
        stat(line, 'strikeOuts') * r.strikeOut +
        stat(line, 'earnedRuns') * r.earnedRun +
        stat(line, 'hits') * r.hitAllowed +
        stat(line, 'baseOnBalls') * r.walkAllowed +
        stat(line, 'wins') * r.win +
        stat(line, 'saves') * r.save

    const confidence = inningsPitched < PROJECTION_LOW_INNINGS ? 'low' : 'normal'
    const gamesStarted = stat(line, 'gamesStarted')

    // The provider labels most pitchers 'SP', so the role comes from usage: a
    // starter started at least half of the games he pitched in.
    if (gamesStarted > 0 && gamesStarted / gamesPlayed >= STARTER_MIN_START_SHARE) {
        // Announced starts are only known a few days ahead: count them, and let
        // the rotation cover the games still without a probable starter.
        const rotationGames = unannouncedTeamGames ?? (announcedStarts === undefined ? teamGames : 0)
        const starts = (announcedStarts ?? 0) + rotationGames / ROTATION_GAMES_PER_START
        return {
            points: round1((seasonPoints / gamesStarted) * starts),
            games: round1(starts),
            starts: round1(starts),
            confidence,
            basis,
            stats: pitchingStats(line, inningsPitched, gamesStarted, starts),
        }
    }

    const appearances = teamGames * availability(gamesPlayed, teamSeasonGames)
    return {
        points: round1((seasonPoints / gamesPlayed) * appearances),
        games: round1(appearances),
        starts: 0,
        confidence,
        basis,
        stats: pitchingStats(line, inningsPitched, gamesPlayed, appearances),
    }
}

// Season totals turned into what the pitcher is expected to add over `units`
// (starts or appearances), given his `unitsSoFar` this season.
function pitchingStats(line: Stats, seasonInnings: number, unitsSoFar: number, units: number): ProjectedStats {
    const perUnit = (value: number) => round2((value / unitsSoFar) * units)
    return {
        ...EMPTY_STATS,
        side: 'pitching',
        w: perUnit(stat(line, 'wins')),
        sv: perUnit(stat(line, 'saves')),
        k: perUnit(stat(line, 'strikeOuts')),
        ip: perUnit(seasonInnings),
        er: perUnit(stat(line, 'earnedRuns')),
        bbh: perUnit(stat(line, 'baseOnBalls') + stat(line, 'hits')),
    }
}
