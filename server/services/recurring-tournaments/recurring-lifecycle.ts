import type { ProviderBoxScore } from '../../providers/dto/provider-schedule.dto'
import type { BaseballScoringRule } from '../scoring/scoring-rule.schema'
import { scoreGameForPlayer } from '../scoring/scoring-engine'
import { CAPTAIN_MULTIPLIER } from '@/shared/team-builder'
import type { RecurringGame } from './recurring.types'

export interface GameObservation {
    gamePk: number
    status: string
    complete: boolean
    boxScore: ProviderBoxScore | null
}

export interface RecurringWeekEvaluation {
    state: 'PARTIAL' | 'FINAL'
    outcome: 'STANDARD' | 'VOID'
    boxes: ProviderBoxScore[]
    pendingGamePks: number[]
    exclusions: { gamePk: number; reason: 'CANCELLED' | 'POSTPONED_TIMEOUT' }[]
}

export function evaluateRecurringWeek(games: RecurringGame[], observations: GameObservation[], endsAt: Date, now: Date): RecurringWeekEvaluation {
    const byGame = new Map(observations.map(row => [row.gamePk, row]))
    const boxes: ProviderBoxScore[] = []
    const pendingGamePks: number[] = []
    const exclusions: RecurringWeekEvaluation['exclusions'] = []
    for (const game of games) {
        const observation = byGame.get(game.gamePk)
        const status = observation?.status ?? game.status
        if (status === 'CANCELLED') {
            exclusions.push({ gamePk: game.gamePk, reason: 'CANCELLED' })
            continue
        }
        const box = observation?.boxScore
        const hasStats = !!box && (box.batters.length > 0 || box.pitchers.length > 0)
        const expired = now.getTime() >= Date.parse(game.originalStartUtc) + 72 * 3600000
        if ((status === 'POSTPONED' || status === 'SUSPENDED') && expired) {
            if (hasStats) boxes.push(box)
            exclusions.push({ gamePk: game.gamePk, reason: 'POSTPONED_TIMEOUT' })
            continue
        }
        if (hasStats) boxes.push(box)
        const hasCompleteStats = !!box && box.batters.length > 0 && box.pitchers.length > 0
        if (!observation?.complete || status !== 'FINAL' || !hasCompleteStats) pendingGamePks.push(game.gamePk)
    }
    const final = endsAt <= now && pendingGamePks.length === 0
    return { state: final ? 'FINAL' : 'PARTIAL', outcome: final && boxes.length === 0 ? 'VOID' : 'STANDARD', boxes, pendingGamePks, exclusions }
}

export function scoreRecurringSlots(
    slots: { externalPlayerId: number; playerName: string; slotPosition: string }[],
    captain: number | null,
    boxes: ProviderBoxScore[],
    rule: BaseballScoringRule,
) {
    const results = slots.map(slot => {
        const games = boxes.map(box => ({ gamePk: box.gamePk, status: box.status, points: scoreGameForPlayer(box, slot.externalPlayerId, rule) }))
        const rawPoints = games.reduce((sum, game) => sum + game.points, 0)
        const isCaptain = slot.externalPlayerId === captain
        const finalPoints = Math.round(rawPoints * (isCaptain ? CAPTAIN_MULTIPLIER : 1) * 100) / 100
        return { ...slot, isCaptain, rawPoints, finalPoints, games }
    })
    return { slots: results, points: Math.round(results.reduce((sum, slot) => sum + slot.finalPoints, 0) * 100) / 100 }
}
