export const MAX_COMPARE_PLAYERS = 4

// `?ids=1,2,3` -> [1, 2, 3]: junk, repeats and anything past four players are dropped.
export function parseCompareIds(raw: string | null): number[] {
    if (!raw) return []
    const ids = raw
        .split(',')
        .map((part) => Number(part.trim()))
        .filter((id) => Number.isInteger(id) && id > 0)
    return [...new Set(ids)].slice(0, MAX_COMPARE_PLAYERS)
}

export function addCompareId(ids: number[], id: number): number[] {
    if (ids.includes(id) || ids.length >= MAX_COMPARE_PLAYERS) return ids
    return [...ids, id]
}

export function removeCompareId(ids: number[], id: number): number[] {
    return ids.filter((existing) => existing !== id)
}

// Indexes of the best value in a row. A missing value never wins, and one lone value is not "best of" anything.
export function bestIndexes(values: (number | null)[], better: 'higher' | 'lower'): Set<number> {
    const present = values.flatMap((value, index) => (value === null ? [] : [{ value, index }]))
    if (present.length < 2) return new Set()
    const target = better === 'higher' ? Math.max(...present.map((p) => p.value)) : Math.min(...present.map((p) => p.value))
    return new Set(present.filter((p) => p.value === target).map((p) => p.index))
}

// How many rows each player leads. A row where everyone with a value is tied (or only one has a value) decides nothing, so it is skipped.
export function countLeads(
    rows: { values: (number | null)[]; better: 'higher' | 'lower' }[],
    playerCount: number,
): { leads: number[]; contested: number } {
    const leads = Array.from({ length: playerCount }, () => 0)
    let contested = 0
    for (const { values, better } of rows) {
        const best = bestIndexes(values, better)
        const present = values.filter((value) => value !== null).length
        if (best.size === 0 || best.size === present) continue
        contested += 1
        best.forEach((index) => (leads[index] += 1))
    }
    return { leads, contested }
}

// Distance from the best value in the row; null when there is nothing to compare or the player is level with the best.
export function gapFromBest(value: number | null, bestValue: number | null): number | null {
    if (value === null || bestValue === null) return null
    const gap = Math.abs(bestValue - value)
    return gap > 0 ? gap : null
}
