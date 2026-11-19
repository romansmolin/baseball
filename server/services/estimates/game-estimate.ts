import type { EstimateFactor, GameEstimate } from '../../../src/shared/estimates'

import {
    HIGH_CONFIDENCE_EDGE,
    HOME_FIELD,
    KNOWN_STARTER_MIN_INNINGS,
    LAST_TEN_WEIGHT,
    LEAGUE_AVERAGE_ERA,
    MAX_PROBABILITY,
    MIN_PROBABILITY,
    STARTER_ADJUSTMENT_CAP,
    STARTER_ERA_WEIGHT,
} from './estimates.const'

export interface TeamStrength {
    winPct: number
    last10WinPct: number
}

export interface StarterStrength {
    era: number
    inningsPitched: number
}

export interface GameEstimateInput {
    gamePk: number
    home: TeamStrength
    away: TeamStrength
    homeStarter: StarterStrength | null
    awayStarter: StarterStrength | null
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const blendedStrength = (team: TeamStrength) =>
    team.winPct * (1 - LAST_TEN_WEIGHT) + team.last10WinPct * LAST_TEN_WEIGHT

// Log5: the chance team A beats team B given each one's win percentage against average opposition.
function log5(a: number, b: number): number {
    const denominator = a * (1 - b) + b * (1 - a)
    return denominator === 0 ? 0.5 : (a * (1 - b)) / denominator
}

const knownStarter = (starter: StarterStrength | null): StarterStrength | null =>
    starter && starter.inningsPitched >= KNOWN_STARTER_MIN_INNINGS ? starter : null

// Positive favours the home team.
function starterEdge(home: StarterStrength | null, away: StarterStrength | null): number {
    const homeEra = home?.era ?? LEAGUE_AVERAGE_ERA
    const awayEra = away?.era ?? LEAGUE_AVERAGE_ERA
    return clamp(
        (awayEra - homeEra) * STARTER_ERA_WEIGHT,
        -STARTER_ADJUSTMENT_CAP,
        STARTER_ADJUSTMENT_CAP,
    )
}

export function estimateGame(input: GameEstimateInput): GameEstimate {
    const homeStarter = knownStarter(input.homeStarter)
    const awayStarter = knownStarter(input.awayStarter)

    const strength = log5(blendedStrength(input.home), blendedStrength(input.away)) - 0.5
    const starter = starterEdge(homeStarter, awayStarter)
    const probability = clamp(0.5 + strength + HOME_FIELD + starter, MIN_PROBABILITY, MAX_PROBABILITY)

    const bothStartersKnown = homeStarter !== null && awayStarter !== null
    const confidence = !bothStartersKnown
        ? 'low'
        : Math.abs(probability - 0.5) >= HIGH_CONFIDENCE_EDGE
          ? 'high'
          : 'medium'

    const factors: EstimateFactor[] = [
        { key: 'team_strength', label: 'Season record and last 10 games', effect: strength },
        { key: 'home_field', label: 'Home field', effect: HOME_FIELD },
        { key: 'starter', label: 'Probable starters', effect: starter },
    ]

    return { gamePk: input.gamePk, homeWinProbability: probability, confidence, factors }
}
