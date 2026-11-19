import type { Confidence, EstimateFactor, PlayerOutlook } from '../../../src/shared/estimates'
import type { ProviderExpectedStats } from '../../providers/dto/provider-expected-stats.dto'
import type { ProviderGameContext } from '../../providers/dto/provider-game-context.dto'
import type {
    ProviderPlayerProfile,
    ProviderStatGroup,
    StatLine,
} from '../../providers/dto/provider-player-profile.dto'

import {
    BATTER_HIGH_PLATE_APPEARANCES,
    BATTER_LOW_PLATE_APPEARANCES,
    COLD_TEMPERATURE_F,
    ERA_FLOOR,
    ERA_SCORE_RANGE,
    FORM_BLEND,
    FORM_EFFECT_CAP,
    FORM_MIN_GAMES,
    FORM_WINDOW_GAMES,
    HOT_TEMPERATURE_F,
    LEAGUE_AVERAGE_WOBA,
    OPS_FLOOR,
    OPS_SCORE_RANGE,
    PITCHER_FORM_MIN_INNINGS,
    PITCHER_FORM_STARTS,
    PITCHER_HIGH_INNINGS,
    PITCHER_LOW_INNINGS,
    PLATOON_BLEND,
    PLATOON_MIN_PLATE_APPEARANCES,
    WEATHER_EFFECT,
    XWOBA_EFFECT_CAP,
    XWOBA_SCORE_WEIGHT,
} from './estimates.const'

export interface PlayerOutlookInput {
    profile: ProviderPlayerProfile
    expected: ProviderExpectedStats | null
    // Throwing hand of the starter this player faces; null when unknown or not applicable.
    opposingStarterThrows: 'L' | 'R' | null
    weather?: ProviderGameContext['weather'] | null
}

interface Judgement {
    base: number
    effects: EstimateFactor[]
    confidence: Confidence
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function num(value: string | number | undefined): number | null {
    if (value === undefined) return null
    const parsed = typeof value === 'number' ? value : Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : null
}

// MLB writes innings as "150.1" meaning 150 and one out.
function innings(value: string | number | undefined): number | null {
    const raw = num(value)
    if (raw === null) return null
    const whole = Math.trunc(raw)
    return whole + Math.round((raw - whole) * 10) / 3
}

const sum = (lines: StatLine[], key: string) =>
    lines.reduce((total, line) => total + (num(line[key]) ?? 0), 0)

function recent<T extends { date: string }>(lines: T[], count: number): T[] {
    return [...lines].sort((a, b) => a.date.localeCompare(b.date)).slice(-count)
}

function judgeHitter(group: ProviderStatGroup, input: PlayerOutlookInput): Judgement | null {
    const season = group.season
    const plateAppearances = num(season?.plateAppearances)
    const seasonOps = num(season?.ops)
    if (!season || !plateAppearances || plateAppearances <= 0 || seasonOps === null) return null

    const opsToScore = 100 / OPS_SCORE_RANGE
    const effects: EstimateFactor[] = []

    const lines = recent(group.gameLog, FORM_WINDOW_GAMES).map((g) => g.stats)
    if (lines.length >= FORM_MIN_GAMES) {
        const atBats = sum(lines, 'atBats')
        const onBase = sum(lines, 'baseOnBalls') + sum(lines, 'hitByPitch')
        const denominator = atBats + onBase + sum(lines, 'sacFlies')
        if (atBats > 0 && denominator > 0) {
            const formOps = (sum(lines, 'hits') + onBase) / denominator + sum(lines, 'totalBases') / atBats
            effects.push({
                key: 'form',
                label: `OPS over the last ${lines.length} games vs the season`,
                effect: clamp((formOps - seasonOps) * opsToScore * FORM_BLEND, -FORM_EFFECT_CAP, FORM_EFFECT_CAP),
            })
        }
    }

    const splitKey = input.opposingStarterThrows === 'L' ? 'vsLeft' : input.opposingStarterThrows === 'R' ? 'vsRight' : null
    const split = group.splits.find((s) => s.key === splitKey)
    const splitOps = num(split?.stats.ops)
    if (split && splitOps !== null && (num(split.stats.plateAppearances) ?? 0) >= PLATOON_MIN_PLATE_APPEARANCES) {
        effects.push({
            key: 'platoon',
            label: `Performance against ${input.opposingStarterThrows === 'L' ? 'left' : 'right'}-handed pitching`,
            effect: (splitOps - seasonOps) * opsToScore * PLATOON_BLEND,
        })
    }

    const woba = num(group.sabermetrics?.woba)
    const xwoba = input.expected?.xwoba ?? null
    if (woba !== null && xwoba !== null) {
        effects.push({
            key: 'expected_stats',
            label: 'Expected wOBA vs actual wOBA',
            effect: clamp((xwoba - woba) * XWOBA_SCORE_WEIGHT, -XWOBA_EFFECT_CAP, XWOBA_EFFECT_CAP),
        })
    }

    const weather = input.weather
    if (weather) {
        let effect = 0
        if (weather.tempF !== null && weather.tempF >= HOT_TEMPERATURE_F) effect += WEATHER_EFFECT
        if (weather.tempF !== null && weather.tempF <= COLD_TEMPERATURE_F) effect -= WEATHER_EFFECT
        if (/out to/i.test(weather.wind)) effect += WEATHER_EFFECT
        if (/in from/i.test(weather.wind)) effect -= WEATHER_EFFECT
        if (effect !== 0) effects.push({ key: 'park_weather', label: 'Temperature and wind', effect })
    }

    return {
        base: (seasonOps - OPS_FLOOR) * opsToScore,
        effects,
        confidence:
            plateAppearances >= BATTER_HIGH_PLATE_APPEARANCES
                ? 'high'
                : plateAppearances >= BATTER_LOW_PLATE_APPEARANCES
                  ? 'medium'
                  : 'low',
    }
}

function judgePitcher(group: ProviderStatGroup, input: PlayerOutlookInput): Judgement | null {
    const season = group.season
    const seasonEra = num(season?.era)
    const seasonInnings = innings(season?.inningsPitched)
    if (!season || seasonEra === null || !seasonInnings || seasonInnings <= 0) return null

    const eraToScore = 100 / ERA_SCORE_RANGE
    const effects: EstimateFactor[] = []

    const starts = recent(group.gameLog, PITCHER_FORM_STARTS).map((g) => g.stats)
    const formInnings = starts.reduce((total, line) => total + (innings(line.inningsPitched) ?? 0), 0)
    if (formInnings >= PITCHER_FORM_MIN_INNINGS) {
        const formEra = (9 * sum(starts, 'earnedRuns')) / formInnings
        effects.push({
            key: 'form',
            label: `ERA over the last ${starts.length} outings vs the season`,
            effect: clamp((seasonEra - formEra) * eraToScore * FORM_BLEND, -FORM_EFFECT_CAP, FORM_EFFECT_CAP),
        })
    }

    const xwoba = input.expected?.xwoba ?? null
    if (xwoba !== null) {
        effects.push({
            key: 'expected_stats',
            label: 'Expected wOBA allowed vs league average',
            effect: clamp((LEAGUE_AVERAGE_WOBA - xwoba) * XWOBA_SCORE_WEIGHT, -XWOBA_EFFECT_CAP, XWOBA_EFFECT_CAP),
        })
    }

    return {
        base: (ERA_FLOOR - seasonEra) * eraToScore,
        effects,
        confidence:
            seasonInnings >= PITCHER_HIGH_INNINGS ? 'high' : seasonInnings >= PITCHER_LOW_INNINGS ? 'medium' : 'low',
    }
}

export function outlookForPlayer(input: PlayerOutlookInput): PlayerOutlook {
    const { profile } = input
    const isPitcher = profile.player.primaryPosition === 'SP' || profile.player.primaryPosition === 'RP'

    const hitter = () => (profile.hitting ? judgeHitter(profile.hitting, input) : null)
    const pitcher = () => (profile.pitching ? judgePitcher(profile.pitching, input) : null)
    const judgement = isPitcher ? (pitcher() ?? hitter()) : (hitter() ?? pitcher())

    if (!judgement) {
        return { externalPlayerId: profile.player.id, score: null, confidence: 'low', factors: [] }
    }

    const total = judgement.base + judgement.effects.reduce((acc, f) => acc + f.effect, 0)
    return {
        externalPlayerId: profile.player.id,
        score: Math.round(clamp(total, 0, 100) * 10) / 10,
        confidence: judgement.confidence,
        factors: judgement.effects,
    }
}
