// Picks the lineup that maximises total projected points for the empty slots,
// keeping hand-picked players, position eligibility, uniqueness and an
// optional salary cap. Deterministic: the model only explains the result.

import { slotAcceptsPoolPosition } from '../../../../src/shared/team-builder'
import type { PoolPosition, RosterSlotDef, SlotId } from '../../../../src/shared/team-builder'

export interface OptimizerPlayer {
    id: number
    name: string
    pos: PoolPosition
    points: number | null
    salary: number | null
    available: boolean
}

export interface OptimizerInput {
    slots: RosterSlotDef[]
    pinned: { slotId: SlotId; playerId: number; salary: number | null }[]
    pool: OptimizerPlayer[]
    salaryCap: number | null
}

export type UnfilledCode = 'NO_ELIGIBLE_PLAYER' | 'NO_PROJECTION' | 'CAP_TOO_LOW' | 'POOL_EMPTY'

export interface UnfilledSlot {
    slotId: SlotId
    code: UnfilledCode
    message: string
}

export interface OptimizerResult {
    picks: { slotId: SlotId; playerId: number }[]
    unfilled: UnfilledSlot[]
    totalPoints: number
}

// Keeps "fill a slot" always better than leaving it empty, and forbids ineligible pairs.
const FILL_BONUS = 1e6
const FORBIDDEN = 1e9
const CANDIDATES_PER_SLOT_TYPE = 40

const money = (value: number) => `$${value.toLocaleString('en-US')}`

export function optimizeLineup(input: OptimizerInput): OptimizerResult {
    const { slots, pinned, pool, salaryCap } = input
    const pinnedSlots = new Set(pinned.map((entry) => entry.slotId))
    const pinnedIds = new Set(pinned.map((entry) => entry.playerId))

    const candidates = pool.filter(
        (player) =>
            player.available &&
            !pinnedIds.has(player.id) &&
            player.points !== null &&
            (salaryCap === null || player.salary !== null),
    )
    const emptySlots = slots.filter((slot) => !pinnedSlots.has(slot.id))
    const starters = emptySlots.filter((slot) => slot.type !== 'BENCH')
    const benchSlots = emptySlots.filter((slot) => slot.type === 'BENCH')

    const unfilled: UnfilledSlot[] = []
    const assigned = new Map<SlotId, OptimizerPlayer>()
    let budget = salaryCap === null ? null : salaryCap - pinned.reduce((sum, entry) => sum + (entry.salary ?? 0), 0)

    let active = [...starters]
    if (budget === null) {
        for (const [slotId, player] of solve(active, candidates, 0)) assigned.set(slotId, player)
    } else {
        for (;;) {
            const within = solveWithin(active, candidates, budget)
            if (within) {
                for (const [slotId, player] of within) assigned.set(slotId, player)
                break
            }
            const priced = active
                .map((slot) => ({ slot, price: cheapestPrice(slot, candidates) }))
                .filter((entry): entry is { slot: RosterSlotDef; price: number } => entry.price !== null)
            if (priced.length === 0) break
            const dearest = priced.reduce((a, b) => (b.price > a.price ? b : a))
            const othersCost = priced
                .filter((entry) => entry.slot.id !== dearest.slot.id)
                .reduce((sum, entry) => sum + entry.price, 0)
            unfilled.push({
                slotId: dearest.slot.id,
                code: 'CAP_TOO_LOW',
                message: `${money(Math.max(0, budget - othersCost))} of budget left, the cheapest available ${dearest.slot.type} for ${dearest.slot.label} costs ${money(dearest.price)}`,
            })
            active = active.filter((slot) => slot.id !== dearest.slot.id)
        }
    }

    // Bench scores nothing, so it only takes the best players nobody else needs.
    const used = new Set([...assigned.values()].map((player) => player.id))
    const leftovers = candidates
        .filter((player) => !used.has(player.id))
        .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
    if (budget !== null) {
        budget -= [...assigned.values()].reduce((sum, player) => sum + (player.salary ?? 0), 0)
    }
    for (const slot of benchSlots) {
        const index = leftovers.findIndex(
            (player) => budget === null || (player.salary ?? Infinity) <= budget,
        )
        if (index === -1) continue
        const [player] = leftovers.splice(index, 1)
        assigned.set(slot.id, player)
        if (budget !== null) budget -= player.salary ?? 0
    }

    const capDropped = new Set(unfilled.map((entry) => entry.slotId))
    for (const slot of emptySlots) {
        if (assigned.has(slot.id) || capDropped.has(slot.id)) continue
        unfilled.push(explainEmptySlot(slot, pool, pinnedIds))
    }

    const picks = slots.flatMap((slot) => {
        const player = assigned.get(slot.id)
        return player ? [{ slotId: slot.id, playerId: player.id }] : []
    })
    const totalPoints = [...assigned.values()].reduce((sum, player) => sum + (player.points ?? 0), 0)
    return { picks, unfilled, totalPoints: Math.round(totalPoints * 10) / 10 }
}

function explainEmptySlot(slot: RosterSlotDef, pool: OptimizerPlayer[], pinnedIds: Set<number>): UnfilledSlot {
    if (pool.length === 0) {
        return { slotId: slot.id, code: 'POOL_EMPTY', message: 'The player pool is empty' }
    }
    const eligible = pool.filter(
        (player) => player.available && !pinnedIds.has(player.id) && slotAcceptsPoolPosition(slot.id, player.pos),
    )
    if (eligible.length === 0) {
        return {
            slotId: slot.id,
            code: 'NO_ELIGIBLE_PLAYER',
            message: `No available ${slot.type} in the player pool for ${slot.label}`,
        }
    }
    if (eligible.every((player) => player.points === null)) {
        return {
            slotId: slot.id,
            code: 'NO_PROJECTION',
            message: `No forecast is available for the ${slot.type} players in the pool, so ${slot.label} was left open`,
        }
    }
    return {
        slotId: slot.id,
        code: 'NO_ELIGIBLE_PLAYER',
        message: `Every eligible ${slot.type} is already placed in another slot, so ${slot.label} was left open`,
    }
}

function cheapestPrice(slot: RosterSlotDef, candidates: OptimizerPlayer[]): number | null {
    const prices = candidates
        .filter((player) => slotAcceptsPoolPosition(slot.id, player.pos))
        .map((player) => player.salary ?? Infinity)
    return prices.length > 0 ? Math.min(...prices) : null
}

const salaryOf = (assignment: Map<SlotId, OptimizerPlayer>) =>
    [...assignment.values()].reduce((sum, player) => sum + (player.salary ?? 0), 0)

// Finds the best assignment that fits the budget by charging `lambda` points
// per salary unit and searching for the smallest charge that fits.
function solveWithin(
    slots: RosterSlotDef[],
    candidates: OptimizerPlayer[],
    budget: number,
): Map<SlotId, OptimizerPlayer> | null {
    const free = solve(slots, candidates, 0)
    if (salaryOf(free) <= budget) return free

    let low = 0
    let high = 1
    let best = solve(slots, candidates, high)
    if (salaryOf(best) > budget) return null
    for (let i = 0; i < 30; i++) {
        const mid = (low + high) / 2
        const attempt = solve(slots, candidates, mid)
        if (salaryOf(attempt) <= budget) {
            best = attempt
            high = mid
        } else {
            low = mid
        }
    }
    return best
}

function solve(slots: RosterSlotDef[], candidates: OptimizerPlayer[], lambda: number): Map<SlotId, OptimizerPlayer> {
    const result = new Map<SlotId, OptimizerPlayer>()
    if (slots.length === 0 || candidates.length === 0) return result

    const worth = (player: OptimizerPlayer) => (player.points ?? 0) - lambda * (player.salary ?? 0)

    // Only the best few per slot type can matter; keeps the matrix small.
    const kept = new Map<number, OptimizerPlayer>()
    for (const type of new Set(slots.map((slot) => slot.type))) {
        const probe = slots.find((slot) => slot.type === type)!
        candidates
            .filter((player) => slotAcceptsPoolPosition(probe.id, player.pos))
            .sort((a, b) => worth(b) - worth(a))
            .slice(0, CANDIDATES_PER_SLOT_TYPE + slots.length)
            .forEach((player) => kept.set(player.id, player))
    }
    const people = [...kept.values()]

    // Columns: every candidate, then one "leave empty" column per slot.
    const cost = slots.map((slot) => [
        ...people.map((player) =>
            slotAcceptsPoolPosition(slot.id, player.pos) ? -(worth(player) + FILL_BONUS) : FORBIDDEN,
        ),
        ...slots.map(() => 0),
    ])
    const columns = hungarian(cost)
    columns.forEach((column, row) => {
        if (column >= 0 && column < people.length && cost[row][column] < FORBIDDEN) {
            result.set(slots[row].id, people[column])
        }
    })
    return result
}

// Minimum-cost assignment of every row to a distinct column (rows <= columns).
function hungarian(cost: number[][]): number[] {
    const rows = cost.length
    const cols = cost[0].length
    const u = new Array<number>(rows + 1).fill(0)
    const v = new Array<number>(cols + 1).fill(0)
    const owner = new Array<number>(cols + 1).fill(0)
    const way = new Array<number>(cols + 1).fill(0)

    for (let i = 1; i <= rows; i++) {
        owner[0] = i
        let j0 = 0
        const minv = new Array<number>(cols + 1).fill(Infinity)
        const used = new Array<boolean>(cols + 1).fill(false)
        do {
            used[j0] = true
            const i0 = owner[j0]
            let delta = Infinity
            let j1 = 0
            for (let j = 1; j <= cols; j++) {
                if (used[j]) continue
                const current = cost[i0 - 1][j - 1] - u[i0] - v[j]
                if (current < minv[j]) {
                    minv[j] = current
                    way[j] = j0
                }
                if (minv[j] < delta) {
                    delta = minv[j]
                    j1 = j
                }
            }
            for (let j = 0; j <= cols; j++) {
                if (used[j]) {
                    u[owner[j]] += delta
                    v[j] -= delta
                } else {
                    minv[j] -= delta
                }
            }
            j0 = j1
        } while (owner[j0] !== 0)
        do {
            const j1 = way[j0]
            owner[j0] = owner[j1]
            j0 = j1
        } while (j0)
    }

    const answer = new Array<number>(rows).fill(-1)
    for (let j = 1; j <= cols; j++) if (owner[j]) answer[owner[j] - 1] = j - 1
    return answer
}
