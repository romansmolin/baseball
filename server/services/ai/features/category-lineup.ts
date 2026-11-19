// Lineup choice for the categories formats (H2H Categories and Roto). A player
// is worth a weighted sum of his category strengths; categories the lineup is
// weak in weigh more. The optimizer then picks the best assignment for those
// scores, and a couple of passes let the weights follow the picks.

import {
    categoryWeights,
    playerCategoryValues,
    teamBalanceScore,
    weightedScore,
} from '../../../../src/shared/team-builder'
import type {
    CategoryKey,
    CategoryScales,
    CategoryValues,
    ProjectedStats,
    RosterSlotDef,
    SlotId,
} from '../../../../src/shared/team-builder'

import { optimizeLineup } from './optimize-lineup'
import type { OptimizerPlayer, OptimizerResult } from './optimize-lineup'

export interface CategoryPlayer extends OptimizerPlayer {
    stats: ProjectedStats | null
}

export interface CategoryLineupInput {
    slots: RosterSlotDef[]
    pinned: { slotId: SlotId; playerId: number; salary: number | null }[]
    pool: CategoryPlayer[]
    scales: CategoryScales
    categories: CategoryKey[]
    salaryCap: number | null
}

export interface CategoryLineupResult extends OptimizerResult {
    // The score each player was picked on (weighted category strength).
    scores: Record<number, number>
    // Category strengths per player, for explaining the picks.
    values: Record<number, CategoryValues>
}

const MAX_PASSES = 3

export function planCategoryLineup(input: CategoryLineupInput): CategoryLineupResult {
    const { slots, pinned, pool, scales, categories, salaryCap } = input

    const values: Record<number, CategoryValues> = {}
    for (const player of pool) {
        if (player.stats) values[player.id] = playerCategoryValues(player.stats, scales, categories)
    }
    const valuesOf = (playerIds: number[]) => playerIds.flatMap((id) => (values[id] ? [values[id]] : []))
    const pinnedIds = pinned.map((entry) => entry.playerId)

    let best: { result: OptimizerResult; scores: Record<number, number>; balance: number } | null = null
    let rosterIds = pinnedIds

    for (let pass = 0; pass < MAX_PASSES; pass++) {
        const weights = categoryWeights(valuesOf(rosterIds), categories)
        const scores: Record<number, number> = {}
        const scored = pool.map((player) => {
            const score = player.stats ? weightedScore(values[player.id], weights, categories) : null
            if (score !== null) scores[player.id] = score
            return { ...player, points: score }
        })

        const result = optimizeLineup({ slots, pinned, pool: scored, salaryCap })
        const nextRoster = [...pinnedIds, ...result.picks.map((pick) => pick.playerId)]
        const balance = teamBalanceScore(valuesOf(nextRoster), categories)
        // A later pass has to be clearly more balanced to replace an earlier one.
        if (best === null || balance > best.balance + 1e-9) best = { result, scores, balance }

        const unchanged = nextRoster.length === rosterIds.length && nextRoster.every((id) => rosterIds.includes(id))
        if (unchanged) break
        rosterIds = nextRoster
    }

    return { ...best!.result, scores: best!.scores, values }
}
