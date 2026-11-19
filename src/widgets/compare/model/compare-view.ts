import type { PlayerAnalytics } from '@/shared/analytics'

import { bestIndexes, countLeads, gapFromBest } from './compare-logic'
import { COMPARE_SECTIONS } from './compare-rows'

export interface CompareCell {
    text: string
    best: boolean
    // "−.045": how far this player is from the best value in the row.
    gap: string | null
}

export interface CompareRowView {
    key: string
    label: string
    hint: string
    cells: CompareCell[]
}

export interface CompareSectionView {
    title: string
    rows: CompareRowView[]
}

export interface CompareView {
    sections: CompareSectionView[]
    // Per player: rows led among the key stats, out of `contested`.
    leads: number[]
    contested: number
    outlookBest: Set<number>
    hasAdvanced: boolean
}

// Rows nobody has data for are dropped, so a pitcher next to a hitter does not drag in a wall of dashes.
export function buildCompareView(players: PlayerAnalytics[], showAdvanced: boolean): CompareView {
    const sections: CompareSectionView[] = []
    const counted: { values: (number | null)[]; better: 'higher' | 'lower' }[] = []
    let hasAdvanced = false

    for (const section of COMPARE_SECTIONS) {
        const rows: CompareRowView[] = []
        for (const row of section.rows) {
            const values = players.map((p) => row.value(p))
            if (values.every((value) => value === null)) continue

            if (row.tier === 'key') counted.push({ values, better: row.better })
            if (row.tier === 'advanced') {
                hasAdvanced = true
                if (!showAdvanced) continue
            }

            const best = row.tier === 'context' ? new Set<number>() : bestIndexes(values, row.better)
            const bestIndex = [...best][0]
            const bestValue = bestIndex === undefined ? null : values[bestIndex]
            rows.push({
                key: row.key,
                label: row.label,
                hint: row.hint,
                cells: values.map((value, index) => {
                    const gap = best.has(index) ? null : gapFromBest(value, bestValue)
                    return { text: row.format(value), best: best.has(index), gap: gap === null ? null : `−${row.format(gap)}` }
                }),
            })
        }
        if (rows.length > 0) sections.push({ title: section.title, rows })
    }

    const { leads, contested } = countLeads(counted, players.length)
    return { sections, leads, contested, outlookBest: bestIndexes(players.map((p) => p.outlook.score), 'higher'), hasAdvanced }
}
