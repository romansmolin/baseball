// How much a player helps a team in each category, relative to the pool the
// forecasts came from. Pure functions shared by the pool view and the AI pick.

import { CATEGORY_KEYS, CATEGORY_SIDE, type CategoryKey, type ProjectedStats } from './categories'

export type CategoryScales = Partial<Record<CategoryKey, { mean: number; sd: number }>>
// Only the player's own side is present: a pitcher has no HR value at all.
export type CategoryValues = Partial<Record<CategoryKey, number>>

const COUNTING_FIELD = {
    R: 'r',
    HR: 'hr',
    RBI: 'rbi',
    SB: 'sb',
    W: 'w',
    SV: 'sv',
    K: 'k',
} as const

const sd = (values: number[], mean: number) =>
    values.length < 2 ? 0 : Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length)

const sum = (stats: ProjectedStats[], field: keyof ProjectedStats) =>
    stats.reduce((total, line) => total + (line[field] as number), 0)

// Rate categories are judged by what a player adds beyond the pool's rate over
// the same volume, so a .300 hitter with 600 at-bats counts for more than one with 100.
function rateContribution(stats: ProjectedStats, key: CategoryKey, poolRate: number): number | null {
    if (key === 'AVG') return stats.ab > 0 ? stats.h - poolRate * stats.ab : null
    if (key === 'ERA') return stats.ip > 0 ? -(stats.er - (poolRate / 9) * stats.ip) : null
    if (key === 'WHIP') return stats.ip > 0 ? -(stats.bbh - poolRate * stats.ip) : null
    return null
}

export function buildCategoryScales(pool: ProjectedStats[]): CategoryScales {
    const hitters = pool.filter((stats) => stats.side === 'hitting')
    const pitchers = pool.filter((stats) => stats.side === 'pitching')
    const scales: CategoryScales = {}

    for (const [key, field] of Object.entries(COUNTING_FIELD) as [keyof typeof COUNTING_FIELD, keyof ProjectedStats][]) {
        const side = CATEGORY_SIDE[key] === 'hitting' ? hitters : pitchers
        const values = side.map((stats) => stats[field] as number)
        const mean = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
        scales[key] = { mean, sd: sd(values, mean) }
    }

    const rates: { key: CategoryKey; side: ProjectedStats[]; rate: number }[] = [
        { key: 'AVG', side: hitters, rate: sum(hitters, 'ab') > 0 ? sum(hitters, 'h') / sum(hitters, 'ab') : 0 },
        { key: 'ERA', side: pitchers, rate: sum(pitchers, 'ip') > 0 ? (9 * sum(pitchers, 'er')) / sum(pitchers, 'ip') : 0 },
        { key: 'WHIP', side: pitchers, rate: sum(pitchers, 'ip') > 0 ? sum(pitchers, 'bbh') / sum(pitchers, 'ip') : 0 },
    ]
    for (const { key, side, rate } of rates) {
        const contributions = side.flatMap((stats) => {
            const value = rateContribution(stats, key, rate)
            return value === null ? [] : [value]
        })
        const mean = contributions.length > 0 ? contributions.reduce((a, b) => a + b, 0) / contributions.length : 0
        scales[key] = { mean: rate, sd: sd(contributions, mean) }
    }
    return scales
}

export function playerCategoryValues(
    stats: ProjectedStats,
    scales: CategoryScales,
    categories: CategoryKey[],
): CategoryValues {
    const values: CategoryValues = {}
    for (const key of categories) {
        if (CATEGORY_SIDE[key] !== stats.side) continue
        const scale = scales[key]
        if (!scale || scale.sd === 0) {
            values[key] = 0
        } else if (key in COUNTING_FIELD) {
            values[key] = ((stats[COUNTING_FIELD[key as keyof typeof COUNTING_FIELD]] as number) - scale.mean) / scale.sd
        } else {
            const contribution = rateContribution(stats, key, scale.mean)
            values[key] = contribution === null ? 0 : contribution / scale.sd
        }
    }
    return values
}

// Team totals for a lineup: counting categories add up, rates come from the sums.
export function categoryTotals(stats: ProjectedStats[]): Partial<Record<CategoryKey, number>> {
    const hitters = stats.filter((line) => line.side === 'hitting')
    const pitchers = stats.filter((line) => line.side === 'pitching')
    const totals: Partial<Record<CategoryKey, number>> = {}
    if (hitters.length > 0) {
        for (const key of ['R', 'HR', 'RBI', 'SB'] as const) totals[key] = sum(hitters, COUNTING_FIELD[key])
        if (sum(hitters, 'ab') > 0) totals.AVG = sum(hitters, 'h') / sum(hitters, 'ab')
    }
    if (pitchers.length > 0) {
        for (const key of ['W', 'SV', 'K'] as const) totals[key] = sum(pitchers, COUNTING_FIELD[key])
        if (sum(pitchers, 'ip') > 0) {
            totals.ERA = (9 * sum(pitchers, 'er')) / sum(pitchers, 'ip')
            totals.WHIP = sum(pitchers, 'bbh') / sum(pitchers, 'ip')
        }
    }
    return totals
}

const WEAK_BOOST_CAP = 1.5

// A category the lineup is weak in counts for more, so picks go where they help.
export function categoryWeights(
    rosterValues: CategoryValues[],
    categories: CategoryKey[],
): Record<CategoryKey, number> {
    const weights = Object.fromEntries(CATEGORY_KEYS.map((key) => [key, 1])) as Record<CategoryKey, number>
    for (const key of categories) {
        const present = rosterValues.flatMap((values) => (values[key] === undefined ? [] : [values[key] as number]))
        if (present.length === 0) continue
        const average = present.reduce((a, b) => a + b, 0) / present.length
        weights[key] = 1 + Math.min(WEAK_BOOST_CAP, Math.max(0, -average))
    }
    return weights
}

export function weightedScore(
    values: CategoryValues,
    weights: Record<CategoryKey, number>,
    categories: CategoryKey[],
): number {
    return categories.reduce((total, key) => total + weights[key] * (values[key] ?? 0), 0)
}

// Diminishing returns per category, so a lineup stacked in one category scores
// below one that is good everywhere.
export function teamBalanceScore(rosterValues: CategoryValues[], categories: CategoryKey[]): number {
    return categories.reduce((total, key) => {
        const categorySum = rosterValues.reduce((acc, values) => acc + (values[key] ?? 0), 0)
        return total + Math.sign(categorySum) * Math.sqrt(Math.abs(categorySum))
    }, 0)
}
