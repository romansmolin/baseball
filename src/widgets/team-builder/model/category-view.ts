import {
    categoryWeights,
    playerCategoryValues,
    weightedScore,
    type CategoryChip,
    type CategoryKey,
    type CategoryScales,
    type CategoryValues,
    type PoolPlayer,
    type ProjectedStats,
} from '@/shared/team-builder'

/** The player's strongest categories (best positive first), for the pool row. */
export function playerCategoryChips(values: CategoryValues, limit = 2): CategoryChip[] {
    return Object.entries(values)
        .filter((entry): entry is [CategoryKey, number] => (entry[1] ?? 0) > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([key, value]) => ({ key, value }))
}

interface WithCategoryViewInput {
    pool: PoolPlayer[]
    statsById: (id: number) => ProjectedStats | undefined
    scales: CategoryScales
    categories: CategoryKey[]
    // Players already on the lineup: categories they are weak in weigh more.
    rosterIds: number[]
}

/** Adds the category score and chips to each pool player for the categories formats. */
export function withCategoryView({
    pool,
    statsById,
    scales,
    categories,
    rosterIds,
}: WithCategoryViewInput): PoolPlayer[] {
    const valuesOf = (id: number) => {
        const stats = statsById(id)
        return stats ? playerCategoryValues(stats, scales, categories) : null
    }
    const rosterValues = rosterIds.flatMap((id) => {
        const values = valuesOf(id)
        return values ? [values] : []
    })
    const weights = categoryWeights(rosterValues, categories)

    return pool.map((player) => {
        const values = valuesOf(player.id)
        return {
            ...player,
            score: values ? Math.round(weightedScore(values, weights, categories) * 100) / 100 : null,
            categoryChips: values ? playerCategoryChips(values) : [],
        }
    })
}
